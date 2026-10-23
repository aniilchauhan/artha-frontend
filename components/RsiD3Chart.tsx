'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useStockContext } from '../context/StockContext';
import { Stock, StockHistory } from '../lib/stock-data';
import { HelpCircle, Sparkles, TrendingUp, TrendingDown, Info } from 'lucide-react';

// Color palette for the plotted lines
const STOCK_COLORS: Record<string, string> = {
  RELIANCE: '#3b82f6', // blue
  TCS: '#10b981',      // emerald
  HDFCBANK: '#8b5cf6', // violet
  INFY: '#f59e0b',     // amber
  ICICIBANK: '#ec4899', // pink
  ITC: '#14b8a6',      // teal
  SBIN: '#ef4444',     // red
  DEFAULT: '#6b7280'   // gray
};

export default function RsiD3Chart() {
  const { stocks, theme } = useStockContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Local state for selected stocks to compare (defaults to RELIANCE and TCS)
  const [selectedTickers, setSelectedTickers] = useState<string[]>(['RELIANCE', 'TCS']);
  const [period, setPeriod] = useState<number>(30); // days: 7, 30, 90

  // Dimensions
  const [dimensions, setDimensions] = useState({ width: 600, height: 280 });
  const [mounted, setMounted] = useState<boolean>(false);

  // Handle Resize using ResizeObserver as instructed
  useEffect(() => {
    setMounted(true);
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      // Maintain a clean ratio but cap height for compact presentation
      setDimensions({
        width: Math.max(width, 280),
        height: 280
      });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Standard 14-day RSI Calculator helper
  const calculateRsiForStock = (history: StockHistory[]): { date: string; value: number }[] => {
    const periodVal = 14;
    const rsiList: { date: string; value: number }[] = [];
    if (history.length <= periodVal) return [];

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= periodVal; i++) {
      const p1 = history[i].close !== undefined ? history[i].close : history[i].price;
      const p0 = history[i - 1].close !== undefined ? history[i - 1].close : history[i - 1].price;
      const difference = p1 - p0;
      if (difference > 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }

    let avgGain = gains / periodVal;
    let avgLoss = losses / periodVal;

    let initialRsi = 100;
    if (avgLoss !== 0) {
      const rs = avgGain / avgLoss;
      initialRsi = 100 - 100 / (1 + rs);
    }
    
    rsiList.push({
      date: history[periodVal].date,
      value: Number(initialRsi.toFixed(2))
    });

    // Wilder's smoothing technique for the remaining periods
    for (let i = periodVal + 1; i < history.length; i++) {
      const p1 = history[i].close !== undefined ? history[i].close : history[i].price;
      const p0 = history[i - 1].close !== undefined ? history[i - 1].close : history[i - 1].price;
      const difference = p1 - p0;
      const currentGain = difference > 0 ? difference : 0;
      const currentLoss = difference < 0 ? -difference : 0;

      avgGain = (avgGain * (periodVal - 1) + currentGain) / periodVal;
      avgLoss = (avgLoss * (periodVal - 1) + currentLoss) / periodVal;

      let currentRsi = 100;
      if (avgLoss !== 0) {
        const rs = avgGain / avgLoss;
        currentRsi = 100 - 100 / (1 + rs);
      }

      rsiList.push({
        date: history[i].date,
        value: Number(currentRsi.toFixed(2))
      });
    }

    return rsiList;
  };

  // Memoize computed RSI dataset sliced to selected period
  const rsiDataset = useMemo(() => {
    return stocks.map((stock) => {
      const fullRsi = calculateRsiForStock(stock.history);
      // Slice to selected period (e.g., last 7, 30, or 90 days)
      const slicedRsi = fullRsi.slice(-period);
      return {
        ticker: stock.ticker,
        name: stock.name,
        color: STOCK_COLORS[stock.ticker] || STOCK_COLORS.DEFAULT,
        data: slicedRsi
      };
    });
  }, [stocks, period]);

  // Filter datasets for only the selected/active tickers
  const activeRsiDatasets = useMemo(() => {
    return rsiDataset.filter(ds => selectedTickers.includes(ds.ticker));
  }, [rsiDataset, selectedTickers]);

  // Determine current overbought/oversold status of all stocks for information banner
  const stockZoneStatus = useMemo(() => {
    return stocks.map(stock => {
      const rsiHistory = calculateRsiForStock(stock.history);
      const latestRsi = rsiHistory[rsiHistory.length - 1];
      const val = latestRsi ? latestRsi.value : 50;
      let zone: 'Overbought' | 'Oversold' | 'Neutral' = 'Neutral';
      if (val >= 70) zone = 'Overbought';
      else if (val <= 30) zone = 'Oversold';
      return {
        ticker: stock.ticker,
        name: stock.name,
        value: val,
        zone
      };
    });
  }, [stocks]);

  // Toggle active ticker
  const handleTickerToggle = (ticker: string) => {
    setSelectedTickers(prev => {
      if (prev.includes(ticker)) {
        // Keep at least one selected
        if (prev.length <= 1) return prev;
        return prev.filter(t => t !== ticker);
      } else {
        return [...prev, ticker];
      }
    });
  };

  // D3 Render Loop
  useEffect(() => {
    if (!svgRef.current || activeRsiDatasets.length === 0) return;

    // Clear previous elements
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 15, right: 25, bottom: 35, left: 35 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Create container group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Extract all dates across active datasets to build domain
    // (Assuming chronological arrays or aligned date values)
    const dates = activeRsiDatasets[0]?.data.map(d => d.date) || [];
    if (dates.length === 0) return;

    // X Scale (Ordinal Band Scale or Point Scale is perfect for categorized chronological days)
    const xScale = d3.scalePoint()
      .domain(dates)
      .range([0, width]);

    // Y Scale (RSI bounded between 0 and 100)
    const yScale = d3.scaleLinear()
      .domain([0, 100])
      .range([height, 0]);

    // Grid lines setup
    const isDark = theme === 'dark';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';
    const axisColor = isDark ? '#475569' : '#cbd5e1';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    // 1. Draw Zone Shading background
    // Oversold Zone (0 - 30)
    g.append('rect')
      .attr('x', 0)
      .attr('y', yScale(30))
      .attr('width', width)
      .attr('height', yScale(0) - yScale(30))
      .attr('fill', isDark ? 'rgba(16, 185, 129, 0.04)' : 'rgba(16, 185, 129, 0.03)');

    // Overbought Zone (70 - 100)
    g.append('rect')
      .attr('x', 0)
      .attr('y', yScale(100))
      .attr('width', width)
      .attr('height', yScale(70) - yScale(100))
      .attr('fill', isDark ? 'rgba(239, 68, 68, 0.04)' : 'rgba(239, 68, 68, 0.03)');

    // Neutral zone line / background divider
    g.append('rect')
      .attr('x', 0)
      .attr('y', yScale(70))
      .attr('width', width)
      .attr('height', yScale(30) - yScale(70))
      .attr('fill', isDark ? 'rgba(148, 163, 184, 0.01)' : 'rgba(241, 245, 249, 0.2)');

    // 2. Reference Lines for 30, 50, 70
    const refLevels = [30, 50, 70];
    refLevels.forEach(level => {
      let strokeStyle = '2 2';
      let strokeColor = gridColor;
      let weight = 1;

      if (level === 70) {
        strokeColor = isDark ? 'rgba(244, 63, 94, 0.35)' : 'rgba(244, 63, 94, 0.25)';
        strokeStyle = '4 4';
        weight = 1.2;
      } else if (level === 30) {
        strokeColor = isDark ? 'rgba(16, 185, 129, 0.35)' : 'rgba(16, 185, 129, 0.25)';
        strokeStyle = '4 4';
        weight = 1.2;
      } else {
        strokeColor = isDark ? '#334155' : '#e2e8f0';
      }

      g.append('line')
        .attr('x1', 0)
        .attr('y1', yScale(level))
        .attr('x2', width)
        .attr('y2', yScale(level))
        .attr('stroke', strokeColor)
        .attr('stroke-width', weight)
        .attr('stroke-dasharray', strokeStyle);

      // Label reference markers
      g.append('text')
        .attr('x', width - 5)
        .attr('y', yScale(level) - 4)
        .attr('fill', level === 70 ? '#f43f5e' : level === 30 ? '#10b981' : textColor)
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .attr('font-weight', 'bold')
        .attr('text-anchor', 'end')
        .text(level === 70 ? '70 OB' : level === 30 ? '30 OS' : '50');
    });

    // 3. Grid Lines (Vertical ticks for dates)
    const tickFilter = Math.ceil(dates.length / 6);
    dates.forEach((d, idx) => {
      if (idx % tickFilter === 0 && idx !== 0 && idx !== dates.length - 1) {
        g.append('line')
          .attr('x1', xScale(d) || 0)
          .attr('y1', 0)
          .attr('x2', xScale(d) || 0)
          .attr('y2', height)
          .attr('stroke', gridColor)
          .attr('stroke-width', 0.8)
          .attr('stroke-dasharray', '2 4');
      }
    });

    // 4. Draw Axes
    // X Axis
    const xAxisGenerator = d3.axisBottom(xScale)
      .tickValues(dates.filter((_, i) => i % tickFilter === 0))
      .tickSize(4);

    const xAxis = g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxisGenerator);

    xAxis.select('.domain').attr('stroke', axisColor).attr('stroke-width', 1.2);
    xAxis.selectAll('.tick line').attr('stroke', axisColor);
    xAxis.selectAll('.tick text')
      .attr('fill', textColor)
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('dy', '8px');

    // Y Axis
    const yAxisGenerator = d3.axisLeft(yScale)
      .tickValues([0, 20, 30, 50, 70, 80, 100])
      .tickSize(4);

    const yAxis = g.append('g').call(yAxisGenerator);
    yAxis.select('.domain').attr('stroke', axisColor).attr('stroke-width', 1.2);
    yAxis.selectAll('.tick line').attr('stroke', axisColor);
    yAxis.selectAll('.tick text')
      .attr('fill', textColor)
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('dx', '-2px');

    // 5. Draw Lines for Each Selected Stock
    const lineGenerator = d3.line<{ date: string; value: number }>()
      .x(d => xScale(d.date) || 0)
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    activeRsiDatasets.forEach((dataset) => {
      // Draw line path
      g.append('path')
        .datum(dataset.data)
        .attr('fill', 'none')
        .attr('stroke', dataset.color)
        .attr('stroke-width', 2)
        .attr('stroke-linecap', 'round')
        .attr('d', lineGenerator)
        .attr('id', `d3-path-${dataset.ticker}`);

      // Draw subtle gradient drop under lines for high visual polish
      const areaGenerator = d3.area<{ date: string; value: number }>()
        .x(d => xScale(d.date) || 0)
        .y0(height)
        .y1(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

      const gradId = `gradient-${dataset.ticker}`;
      const defs = svg.append('defs');
      const gradient = defs.append('linearGradient')
        .attr('id', gradId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', dataset.color)
        .attr('stop-opacity', 0.08);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', dataset.color)
        .attr('stop-opacity', 0.0);

      g.append('path')
        .datum(dataset.data)
        .attr('fill', `url(#${gradId})`)
        .attr('d', areaGenerator);
    });

    // 6. Interactive Tooltip overlay & Crosshair Line
    const crosshair = g.append('line')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', isDark ? '#475569' : '#cbd5e1')
      .attr('stroke-width', 1.2)
      .attr('stroke-dasharray', '3 3')
      .style('opacity', 0);

    const tooltipGroup = g.append('g')
      .style('opacity', 0);

    // Dynamic Tooltip background box
    const tooltipBg = tooltipGroup.append('rect')
      .attr('fill', isDark ? '#0f172a' : '#ffffff')
      .attr('stroke', isDark ? '#1e293b' : '#e2e8f0')
      .attr('stroke-width', 1.5)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('width', 160)
      .attr('height', activeRsiDatasets.length * 18 + 24)
      .style('filter', 'drop-shadow(0 4px 6px -1px rgb(0 0 0 / 0.1))');

    const tooltipText = tooltipGroup.append('g')
      .attr('transform', 'translate(10, 15)');

    // Invisible mouse event tracking rect
    g.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .on('mousemove', function (event) {
        const [mouseX] = d3.pointer(event);
        
        // Find nearest date based on mouse position
        const range = xScale.range();
        const step = (range[1] - range[0]) / (dates.length - 1);
        const index = Math.round((mouseX - range[0]) / step);
        const clampedIndex = Math.max(0, Math.min(dates.length - 1, index));
        const targetDate = dates[clampedIndex];

        if (!targetDate) return;

        const xPos = xScale(targetDate) || 0;
        
        // Update crosshair position
        crosshair
          .attr('x1', xPos)
          .attr('x2', xPos)
          .style('opacity', 1);

        // Populate dynamic tooltip details
        tooltipText.selectAll('*').remove();
        
        // Header (Date)
        tooltipText.append('text')
          .attr('x', 0)
          .attr('y', 0)
          .attr('fill', isDark ? '#94a3b8' : '#64748b')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .attr('font-weight', 'bold')
          .text(targetDate);

        // Values for each stock
        activeRsiDatasets.forEach((ds, i) => {
          const matchingPoint = ds.data.find(d => d.date === targetDate);
          const rsiVal = matchingPoint ? matchingPoint.value : null;
          const displayVal = rsiVal !== null ? rsiVal.toFixed(1) : 'N/A';
          
          let suffix = '';
          if (rsiVal !== null) {
            if (rsiVal >= 70) suffix = ' (OB)';
            else if (rsiVal <= 30) suffix = ' (OS)';
          }

          const lineGroup = tooltipText.append('g')
            .attr('transform', `translate(0, ${18 + i * 16})`);

          // Stock visual color circle indicator
          lineGroup.append('circle')
            .attr('cx', 3)
            .attr('cy', -4)
            .attr('r', 3.5)
            .attr('fill', ds.color);

          // Stock name & value text
          lineGroup.append('text')
            .attr('x', 12)
            .attr('y', 0)
            .attr('fill', isDark ? '#f1f5f9' : '#1e293b')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text(`${ds.ticker}: `);

          lineGroup.append('text')
            .attr('x', 12 + ds.ticker.length * 6 + 6)
            .attr('y', 0)
            .attr('fill', rsiVal !== null && rsiVal >= 70 ? '#f43f5e' : rsiVal !== null && rsiVal <= 30 ? '#10b981' : (isDark ? '#e2e8f0' : '#475569'))
            .attr('font-size', '10px')
            .attr('font-family', 'monospace')
            .attr('font-weight', 'bold')
            .text(`${displayVal}${suffix}`);
        });

        // Smart dynamic positioning of the tooltip box to avoid overflow boundary clipping
        let tooltipX = xPos + 12;
        if (tooltipX + 170 > width) {
          tooltipX = xPos - 172;
        }

        let tooltipY = 10;

        tooltipGroup
          .attr('transform', `translate(${tooltipX}, ${tooltipY})`)
          .style('opacity', 1);
      })
      .on('mouseleave', function () {
        crosshair.style('opacity', 0);
        tooltipGroup.style('opacity', 0);
      });

  }, [activeRsiDatasets, dimensions, theme, period]);

  // Identify stocks currently flagged in Overbought or Oversold categories
  const overboughtStocks = useMemo(() => stockZoneStatus.filter(s => s.zone === 'Overbought'), [stockZoneStatus]);
  const oversoldStocks = useMemo(() => stockZoneStatus.filter(s => s.zone === 'Oversold'), [stockZoneStatus]);

  if (!mounted) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse" id="d3-rsi-analyzer-card-skeleton">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-pink-500/10 rounded-lg text-pink-600 dark:text-pink-400 border border-pink-500/10 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded-md" />
              <div className="h-3 w-64 bg-gray-200 dark:bg-gray-800 rounded-md mt-1.5" />
            </div>
          </div>
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded-md" />
        </div>
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-1/2" />
        <div className="w-full h-[280px] bg-gray-100 dark:bg-gray-950 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-16 bg-gray-50 dark:bg-gray-950 rounded-xl" />
          <div className="h-16 bg-gray-50 dark:bg-gray-950 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4" id="d3-rsi-analyzer-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-pink-500/10 rounded-lg text-pink-600 dark:text-pink-400 border border-pink-500/10 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
              D3 RSI Multi-Stock Compare
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
              Select multiple equities to plot and monitor Relative Strength Index (RSI) ranges
            </p>
          </div>
        </div>

        {/* Timeframe controls */}
        <div className="flex bg-gray-50 dark:bg-gray-950 p-0.5 rounded-lg border border-gray-200/50 dark:border-gray-800 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setPeriod(7)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              period === 7
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            id="btn-rsi-period-7"
          >
            7D
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              period === 30
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            id="btn-rsi-period-30"
          >
            30D
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              period === 90
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            id="btn-rsi-period-90"
          >
            90D
          </button>
        </div>
      </div>

      {/* Checkboxes / pills list of available stock tickers */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-gray-400 dark:text-gray-500 font-mono text-[9px] uppercase mr-1">Active Plots:</span>
        {stocks.map((stock) => {
          const isActive = selectedTickers.includes(stock.ticker);
          const color = STOCK_COLORS[stock.ticker] || STOCK_COLORS.DEFAULT;
          return (
            <button
              key={stock.ticker}
              onClick={() => handleTickerToggle(stock.ticker)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-gray-50 dark:bg-gray-800 shadow-xs text-gray-900 dark:text-gray-100'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
              }`}
              style={{
                borderColor: isActive ? color : undefined,
                boxShadow: isActive ? `0 1px 3px ${color}10` : undefined
              }}
              id={`btn-rsi-toggle-${stock.ticker}`}
            >
              <span 
                className="h-2 w-2 rounded-full" 
                style={{ backgroundColor: color }} 
              />
              <span>{stock.ticker}</span>
              {isActive && (
                <span className="text-[9px] font-mono opacity-80 bg-gray-200/50 dark:bg-gray-800 px-1 py-0.2 rounded">
                  {stockZoneStatus.find(s => s.ticker === stock.ticker)?.value.toFixed(0)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SVG Canvas Container */}
      <div 
        ref={containerRef} 
        className="w-full h-[280px] relative select-none rounded-xl bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/50 dark:border-gray-800/30 overflow-hidden"
        id="d3-rsi-svg-canvas-container"
      >
        <svg 
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="mx-auto"
        />
      </div>

      {/* Info Panel / Flags Zone details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 text-xs">
        {/* Overbought Alerts (>= 70) */}
        <div className="border border-rose-100/50 dark:border-rose-950/30 bg-rose-50/20 dark:bg-rose-950/5 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider font-mono text-[10px]">Overbought (RSI ≥ 70)</span>
          </div>
          {overboughtStocks.length === 0 ? (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              No active stocks are currently in overbought territory.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {overboughtStocks.map(s => (
                <span 
                  key={s.ticker} 
                  className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]"
                >
                  {s.ticker} ({s.value.toFixed(0)})
                </span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-1 font-sans">
            High values show powerful positive momentum but may trigger technical reversals/selloffs.
          </p>
        </div>

        {/* Oversold Alerts (<= 30) */}
        <div className="border border-emerald-100/50 dark:border-emerald-950/30 bg-emerald-50/20 dark:bg-emerald-950/5 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider font-mono text-[10px]">Oversold (RSI ≤ 30)</span>
          </div>
          {oversoldStocks.length === 0 ? (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
              No active stocks are currently in oversold territory.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {oversoldStocks.map(s => (
                <span 
                  key={s.ticker} 
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-mono font-bold text-[10px]"
                >
                  {s.ticker} ({s.value.toFixed(0)})
                </span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-1 font-sans">
            Low values show aggressive downward sentiment but may trigger buybacks/bounceplays.
          </p>
        </div>
      </div>
    </div>
  );
}
