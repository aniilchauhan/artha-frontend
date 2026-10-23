'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';

interface D3LineChartProps {
  data: any[];
  isUp: boolean;
  showSma5: boolean;
  showSma15: boolean;
  showSma20: boolean;
  showSma50: boolean;
  showBollinger: boolean;
  showPatterns: boolean;
  theme: 'dark' | 'light' | string;
  onHoverPoint: (point: any) => void;
  hoveredPointData: any | null;
  chartStyle?: 'line' | 'candlestick';
}

export default function D3LineChart({
  data,
  isUp,
  showSma5,
  showSma15,
  showSma20,
  showSma50,
  showBollinger,
  showPatterns,
  theme,
  onHoverPoint,
  hoveredPointData,
  chartStyle = 'line',
}: D3LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 280 });
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Refs for D3 transitions
  const mainLineRef = useRef<SVGPathElement>(null);
  const areaFillRef = useRef<SVGPathElement>(null);
  const sma5Ref = useRef<SVGPathElement>(null);
  const sma15Ref = useRef<SVGPathElement>(null);
  const sma50Ref = useRef<SVGPathElement>(null);
  const bbAreaRef = useRef<SVGPathElement>(null);
  const bbUpperRef = useRef<SVGPathElement>(null);
  const bbLowerRef = useRef<SVGPathElement>(null);

  // Dynamically observe container resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    let animationFrameId: number;
    
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      
      // Use requestAnimationFrame to throttle state updates on window resizing
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        setDimensions({
          width: width || 600,
          height: height || 280,
        });
      });
    });
    
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const marginTop = 25;
  const marginRight = 15;
  const marginBottom = 30;
  const marginLeft = 45;

  const { width, height } = dimensions;

  // Compute Scales, Paths, and Ticks using useMemo
  const {
    xScale,
    yScale,
    linePath,
    areaPath,
    sma5Path,
    sma15Path,
    sma50Path,
    bbAreaPath,
    bbUpperPath,
    bbLowerPath,
    xTicks,
    yTicks,
  } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        xScale: null,
        yScale: null,
        linePath: '',
        areaPath: '',
        sma5Path: '',
        sma15Path: '',
        sma50Path: '',
        bbAreaPath: '',
        bbUpperPath: '',
        bbLowerPath: '',
        xTicks: [],
        yTicks: [],
      };
    }

    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([marginLeft, width - marginRight]);

    // Find min and max for y-axis
    let yMin = chartStyle === 'candlestick'
      ? d3.min(data, (d) => d.low) ?? d3.min(data, (d) => d.price) ?? 0
      : d3.min(data, (d) => d.price) ?? 0;
    let yMax = chartStyle === 'candlestick'
      ? d3.max(data, (d) => d.high) ?? d3.max(data, (d) => d.price) ?? 100
      : d3.max(data, (d) => d.price) ?? 100;

    // Expand min/max bounds based on active indicators to ensure no overflow
    data.forEach((d) => {
      if (showSma5 && d.sma5 !== undefined) {
        yMin = Math.min(yMin, d.sma5);
        yMax = Math.max(yMax, d.sma5);
      }
      if (showSma15 && d.sma15 !== undefined) {
        yMin = Math.min(yMin, d.sma15);
        yMax = Math.max(yMax, d.sma15);
      }
      if (showSma50 && d.sma50 !== undefined) {
        yMin = Math.min(yMin, d.sma50);
        yMax = Math.max(yMax, d.sma50);
      }
      if (showBollinger) {
        if (d.bbLower !== undefined) yMin = Math.min(yMin, d.bbLower);
        if (d.bbUpper !== undefined) yMax = Math.max(yMax, d.bbUpper);
      }
    });

    // Add 8% vertical padding
    const padding = (yMax - yMin) * 0.08 || 5;
    const yScale = d3.scaleLinear()
      .domain([yMin - padding, yMax + padding])
      .range([height - marginBottom, marginTop]);

    // Area and Line path generators (with smooth curves)
    const lineGen = d3.line<any>()
      .x((_, i) => xScale(i)!)
      .y((d) => yScale(d.price)!)
      .curve(d3.curveMonotoneX);

    const areaGen = d3.area<any>()
      .x((_, i) => xScale(i)!)
      .y0(height - marginBottom)
      .y1((d) => yScale(d.price)!)
      .curve(d3.curveMonotoneX);

    const linePath = lineGen(data) || '';
    const areaPath = areaGen(data) || '';

    // SMA 5
    const sma5Gen = d3.line<any>()
      .defined((d) => d.sma5 !== undefined && d.sma5 !== null)
      .x((_, i) => xScale(i)!)
      .y((d) => yScale(d.sma5)!)
      .curve(d3.curveMonotoneX);
    const sma5Path = sma5Gen(data) || '';

    // SMA 15
    const sma15Gen = d3.line<any>()
      .defined((d) => d.sma15 !== undefined && d.sma15 !== null)
      .x((_, i) => xScale(i)!)
      .y((d) => yScale(d.sma15)!)
      .curve(d3.curveMonotoneX);
    const sma15Path = sma15Gen(data) || '';

    // SMA 50
    const sma50Gen = d3.line<any>()
      .defined((d) => d.sma50 !== undefined && d.sma50 !== null)
      .x((_, i) => xScale(i)!)
      .y((d) => yScale(d.sma50)!)
      .curve(d3.curveMonotoneX);
    const sma50Path = sma50Gen(data) || '';

    // Bollinger Bands Area & Outer Lines
    const bbAreaGen = d3.area<any>()
      .defined((d) => d.bbUpper !== undefined && d.bbLower !== undefined && d.bbUpper !== null && d.bbLower !== null)
      .x((_, i) => xScale(i)!)
      .y0((d) => yScale(d.bbLower)!)
      .y1((d) => yScale(d.bbUpper)!)
      .curve(d3.curveMonotoneX);
    const bbAreaPath = bbAreaGen(data) || '';

    const bbUpperGen = d3.line<any>()
      .defined((d) => d.bbUpper !== undefined && d.bbUpper !== null)
      .x((_, i) => xScale(i)!)
      .y((d) => yScale(d.bbUpper)!)
      .curve(d3.curveMonotoneX);
    const bbUpperPath = bbUpperGen(data) || '';

    const bbLowerGen = d3.line<any>()
      .defined((d) => d.bbLower !== undefined && d.bbLower !== null)
      .x((_, i) => xScale(i)!)
      .y((d) => yScale(d.bbLower)!)
      .curve(d3.curveMonotoneX);
    const bbLowerPath = bbLowerGen(data) || '';

    // Generate x-axis ticks
    const tickCount = Math.min(data.length, Math.max(3, Math.floor(width / 95)));
    const step = Math.max(1, Math.floor(data.length / tickCount));
    const xTicks = [];
    for (let i = 0; i < data.length; i += step) {
      xTicks.push({
        index: i,
        date: data[i].date,
        x: xScale(i)!,
      });
    }
    // Assure the final point date is always included
    if (xTicks[xTicks.length - 1]?.index !== data.length - 1) {
      xTicks.push({
        index: data.length - 1,
        date: data[data.length - 1].date,
        x: xScale(data.length - 1)!,
      });
    }

    // Generate y-axis ticks
    const yTicks = yScale.ticks(5).map((val) => ({
      value: val,
      y: yScale(val)!,
    }));

    return {
      xScale,
      yScale,
      linePath,
      areaPath,
      sma5Path,
      sma15Path,
      sma50Path,
      bbAreaPath,
      bbUpperPath,
      bbLowerPath,
      xTicks,
      yTicks,
    };
  }, [data, width, height, showSma5, showSma15, showSma50, showBollinger, chartStyle]);

  // Determine active hovered index mapping
  const hoveredIndex = useMemo(() => {
    if (!hoveredPointData || !data) return -1;
    return data.findIndex((d) => d.date === hoveredPointData.date);
  }, [hoveredPointData, data]);

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!data || data.length === 0 || !xScale) return;

    const svgRect = event.currentTarget.getBoundingClientRect();
    const mouseX = event.clientX - svgRect.left;
    const mouseY = event.clientY - svgRect.top;

    setMousePos({ x: mouseX, y: mouseY });

    // Convert screen x coordinate back to data array index
    const invertedIndex = xScale.invert(mouseX);
    const nearestIndex = Math.max(
      0,
      minPriceIdx(data.length - 1, Math.round(invertedIndex))
    );

    onHoverPoint(data[nearestIndex]);
  };

  const handleMouseLeave = () => {
    onHoverPoint(null);
    setMousePos(null);
  };

  const minPriceIdx = (max: number, current: number) => {
    return Math.min(max, current);
  };

  // Run smooth D3 transition transitions when paths change
  useEffect(() => {
    const duration = 650;
    const ease = d3.easeCubicOut;

    if (mainLineRef.current && linePath) {
      d3.select(mainLineRef.current)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('d', linePath);
    }
    if (areaFillRef.current && areaPath) {
      d3.select(areaFillRef.current)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('d', areaPath);
    }
    if (sma5Ref.current && sma5Path) {
      d3.select(sma5Ref.current)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('d', sma5Path);
    }
    if (sma15Ref.current && sma15Path) {
      d3.select(sma15Ref.current)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('d', sma15Path);
    }
    if (sma50Ref.current && sma50Path) {
      d3.select(sma50Ref.current)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('d', sma50Path);
    }
    if (bbAreaRef.current && bbAreaPath) {
      d3.select(bbAreaRef.current)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('d', bbAreaPath);
    }
    if (bbUpperRef.current && bbUpperPath) {
      d3.select(bbUpperRef.current)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('d', bbUpperPath);
    }
    if (bbLowerRef.current && bbLowerPath) {
      d3.select(bbLowerRef.current)
        .transition()
        .duration(duration)
        .ease(ease)
        .attr('d', bbLowerPath);
    }
  }, [
    linePath,
    areaPath,
    sma5Path,
    sma15Path,
    sma50Path,
    bbAreaPath,
    bbUpperPath,
    bbLowerPath,
  ]);

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-xs font-mono text-gray-400">
        No active timeframe history to trace.
      </div>
    );
  }

  const isDark = theme !== 'light';

  return (
    <div
      ref={containerRef}
      className="h-full w-full relative select-none"
      id="d3-chart-canvas-container"
    >
      <svg
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="overflow-visible"
      >
        <defs>
          {/* Main Price Area Gradient */}
          <linearGradient id="d3ColorPrice" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={isUp ? '#10b981' : '#ef4444'}
              stopOpacity={isDark ? 0.22 : 0.16}
            />
            <stop
              offset="95%"
              stopColor={isUp ? '#10b981' : '#ef4444'}
              stopOpacity={0.0}
            />
          </linearGradient>

          {/* Grid line subtle gradient for high quality aesthetics */}
          <linearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.04} />
            <stop offset="10%" stopColor="currentColor" stopOpacity={0.12} />
            <stop offset="90%" stopColor="currentColor" stopOpacity={0.12} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0.04} />
          </linearGradient>
        </defs>

        {/* Y Axis Grid lines */}
        <g className="text-gray-200 dark:text-gray-800" id="d3-y-axis-grids">
          {yTicks.map((tick, i) => (
            <motion.line
              key={`y-grid-${tick.value}`}
              initial={{ opacity: 0, y1: tick.y, y2: tick.y }}
              animate={{ opacity: 1, y1: tick.y, y2: tick.y }}
              transition={{ type: 'tween', duration: 0.4 }}
              x1={marginLeft}
              x2={width - marginRight}
              stroke="url(#gridGrad)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ))}
        </g>

        {/* X Axis Grid lines */}
        <g className="text-gray-200 dark:text-gray-800" id="d3-x-axis-grids">
          {xTicks.map((tick, i) => (
            <motion.line
              key={`x-grid-${tick.date}`}
              initial={{ opacity: 0, x1: tick.x, x2: tick.x }}
              animate={{ opacity: 1, x1: tick.x, x2: tick.x }}
              transition={{ type: 'tween', duration: 0.4 }}
              y1={marginTop}
              y2={height - marginBottom}
              stroke="url(#gridGrad)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ))}
        </g>

        {/* Axis Ticks Labels */}
        <g className="text-[9px] font-mono font-semibold text-gray-400 dark:text-gray-500 select-none">
          {/* Y Axis Labels */}
          {yTicks.map((tick, i) => (
            <motion.text
              key={`y-label-${tick.value}`}
              initial={{ opacity: 0, y: tick.y }}
              animate={{ opacity: 1, y: tick.y }}
              transition={{ type: 'tween', duration: 0.4 }}
              x={marginLeft - 8}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-current"
            >
              ₹{tick.value.toFixed(0)}
            </motion.text>
          ))}

          {/* X Axis Labels */}
          {xTicks.map((tick, i) => (
            <motion.text
              key={`x-label-${tick.date}`}
              initial={{ opacity: 0, x: tick.x }}
              animate={{ opacity: 1, x: tick.x }}
              transition={{ type: 'tween', duration: 0.4 }}
              y={height - marginBottom + 14}
              textAnchor="middle"
              className="fill-current"
            >
              {tick.date.split('-').slice(1).join('/')}
            </motion.text>
          ))}
        </g>

        {/* Bollinger Bands Filled Area */}
        {showBollinger && bbAreaPath && (
          <path
            ref={bbAreaRef}
            d={bbAreaPath}
            fill="#14b8a6"
            fillOpacity={isDark ? 0.04 : 0.03}
            id="d3-bb-band-area"
          />
        )}

        {/* Bollinger Bands Upper Line */}
        {showBollinger && bbUpperPath && (
          <path
            ref={bbUpperRef}
            d={bbUpperPath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth={1.25}
            strokeDasharray="4 3"
            className="opacity-75"
            id="d3-bb-upper-line"
          />
        )}

        {/* Bollinger Bands Lower Line */}
        {showBollinger && bbLowerPath && (
          <path
            ref={bbLowerRef}
            d={bbLowerPath}
            fill="none"
            stroke="#14b8a6"
            strokeWidth={1.25}
            strokeDasharray="4 3"
            className="opacity-75"
            id="d3-bb-lower-line"
          />
        )}

        {/* Technical Indicators: SMA 50 */}
        {showSma50 && sma50Path && (
          <motion.path
            ref={node => { sma50Ref.current = node; }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            d={sma50Path}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinecap="round"
            id="d3-sma50-line"
          />
        )}

        {/* Technical Indicators: SMA 15 */}
        {showSma15 && sma15Path && (
          <motion.path
            ref={node => { sma15Ref.current = node; }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            d={sma15Path}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeLinecap="round"
            id="d3-sma15-line"
          />
        )}

        {/* Technical Indicators: SMA 5 */}
        {showSma5 && sma5Path && (
          <motion.path
            ref={node => { sma5Ref.current = node; }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            d={sma5Path}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeLinecap="round"
            id="d3-sma5-line"
          />
        )}

        {/* Price Area Fill */}
        {chartStyle !== 'candlestick' && areaPath && (
          <path
            ref={areaFillRef}
            d={areaPath}
            fill="url(#d3ColorPrice)"
            id="d3-price-gradient-area"
          />
        )}

        {/* Main Price Trend Line */}
        {chartStyle !== 'candlestick' && linePath && (
          <path
            ref={mainLineRef}
            d={linePath}
            fill="none"
            stroke={isUp ? '#10b981' : '#ef4444'}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            id="d3-main-price-line"
          />
        )}

        {/* Candlesticks Representation */}
        {chartStyle === 'candlestick' && xScale && yScale && (
          <g id="d3-candlesticks-group">
            {data.map((d, i) => {
              const cx = xScale(i)!;
              const yOpen = yScale(d.open ?? d.price)!;
              const yClose = yScale(d.close ?? d.price)!;
              const yHigh = yScale(d.high ?? d.price)!;
              const yLow = yScale(d.low ?? d.price)!;
              
              const isBullish = (d.close ?? d.price) >= (d.open ?? d.price);
              const candleColor = isBullish 
                ? (isDark ? '#10b981' : '#059669') // Emerald color
                : (isDark ? '#f43f5e' : '#dc2626'); // Rose/Red color
              
              const totalBars = data.length;
              const availableWidth = width - marginLeft - marginRight;
              const candleWidth = Math.max(1.5, Math.min(25, (availableWidth / totalBars) * 0.65));
              
              const rectY = Math.min(yOpen, yClose);
              const rectHeight = Math.max(1.5, Math.abs(yOpen - yClose));

              return (
                <g key={`candle-${d.date}-${i}`} className="opacity-95 hover:opacity-100 transition-opacity">
                  {/* Wick (High-Low) line */}
                  <line
                    x1={cx}
                    y1={yHigh}
                    x2={cx}
                    y2={yLow}
                    stroke={candleColor}
                    strokeWidth={1.25}
                  />
                  {/* Real Body (Open-Close) rect */}
                  <rect
                    x={cx - candleWidth / 2}
                    y={rectY}
                    width={candleWidth}
                    height={rectHeight}
                    fill={candleColor}
                    stroke={candleColor}
                    strokeWidth={0.5}
                    rx={candleWidth > 4 ? 1 : 0}
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Interactive Candlestick Patterns Markers */}
        {showPatterns &&
          data.map((d, i) => {
            if (!d.detectedPattern || !xScale || !yScale) return null;
            const pattern = d.detectedPattern;
            const cx = xScale(i)!;
            const cy = yScale(d.price)!;
            const isPatternBullish = pattern.isBullish;

            return (
              <g
                key={`d3-pattern-${d.date}`}
                className="cursor-pointer select-none transition-transform hover:scale-110"
              >
                {/* Outer Glow */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={8}
                  fill={pattern.color}
                  fillOpacity={0.25}
                  stroke={pattern.color}
                  strokeWidth={1.5}
                />
                {/* Center Core dot */}
                <circle cx={cx} cy={cy} r={2.5} fill={pattern.color} />

                {/* Abbreviation Badge Offset above or below the node */}
                <g transform={`translate(${cx}, ${isPatternBullish ? cy - 17 : cy + 17})`}>
                  <rect
                    x={-18}
                    y={-7}
                    width={36}
                    height={13}
                    rx={3.5}
                    fill={isDark ? '#090d16' : '#ffffff'}
                    stroke={pattern.color}
                    strokeWidth={1}
                    className="shadow-sm"
                  />
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={pattern.color}
                    fontSize={7.5}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {pattern.abbreviation}
                  </text>
                </g>
              </g>
            );
          })}

        {/* Live Active Hover Interactivity Cursor */}
        {hoveredIndex !== -1 && xScale && yScale && (
          <g id="d3-interactive-hover-cursor">
            {/* Vertical crosshair line */}
            <line
              x1={xScale(hoveredIndex)!}
              y1={marginTop}
              x2={xScale(hoveredIndex)!}
              y2={height - marginBottom}
              stroke={isDark ? '#6366f1' : '#4f46e5'}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              className="opacity-70 pointer-events-none"
            />

            {/* Horizontal crosshair line */}
            <line
              x1={marginLeft}
              y1={yScale(data[hoveredIndex].price)!}
              x2={width - marginRight}
              y2={yScale(data[hoveredIndex].price)!}
              stroke={isDark ? '#6366f1' : '#4f46e5'}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              className="opacity-70 pointer-events-none"
            />

            {/* Hovered Price Pulse dot */}
            <circle
              cx={xScale(hoveredIndex)!}
              cy={yScale(data[hoveredIndex].price)!}
              r={7}
              fill={isUp ? '#10b981' : '#ef4444'}
              fillOpacity={0.3}
              stroke={isUp ? '#10b981' : '#ef4444'}
              strokeWidth={1.5}
            />
            <circle
              cx={xScale(hoveredIndex)!}
              cy={yScale(data[hoveredIndex].price)!}
              r={3}
              fill={isUp ? '#10b981' : '#ef4444'}
            />

            {/* Indicator hovering overlays matching colors */}
            {showSma5 && data[hoveredIndex].sma5 !== undefined && (
              <circle
                cx={xScale(hoveredIndex)!}
                cy={yScale(data[hoveredIndex].sma5)!}
                r={4}
                fill="#f59e0b"
                stroke={isDark ? '#090d16' : '#ffffff'}
                strokeWidth={1.5}
              />
            )}

            {showSma15 && data[hoveredIndex].sma15 !== undefined && (
              <circle
                cx={xScale(hoveredIndex)!}
                cy={yScale(data[hoveredIndex].sma15)!}
                r={4}
                fill="#8b5cf6"
                stroke={isDark ? '#090d16' : '#ffffff'}
                strokeWidth={1.5}
              />
            )}

            {showSma20 && data[hoveredIndex].sma20 !== undefined && (
              <circle
                cx={xScale(hoveredIndex)!}
                cy={yScale(data[hoveredIndex].sma20)!}
                r={4}
                fill="#ea580c"
                stroke={isDark ? '#090d16' : '#ffffff'}
                strokeWidth={1.5}
              />
            )}

            {showSma50 && data[hoveredIndex].sma50 !== undefined && (
              <circle
                cx={xScale(hoveredIndex)!}
                cy={yScale(data[hoveredIndex].sma50)!}
                r={4}
                fill="#3b82f6"
                stroke={isDark ? '#090d16' : '#ffffff'}
                strokeWidth={1.5}
              />
            )}
          </g>
        )}
      </svg>

      {/* Floating Tooltip */}
      {mousePos && hoveredIndex !== -1 && (
        <div
          className="absolute pointer-events-none z-50 bg-slate-900/95 dark:bg-slate-950/95 text-white border border-slate-700/50 rounded-lg p-3 shadow-xl backdrop-blur-sm text-xs font-mono space-y-1.5 min-w-[150px]"
          style={{
            left: `${mousePos.x + 15}px`,
            top: `${mousePos.y + 15}px`,
            // Adjust position if it would go off screen
            transform: mousePos.x + 180 > width ? 'translateX(-110%)' : 'none',
          }}
        >
          <div className="font-sans font-bold text-[10px] text-slate-400 border-b border-slate-700/50 pb-1">
            {data[hoveredIndex].date}
          </div>
          {chartStyle === 'candlestick' ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] border-b border-slate-700/50 pb-1.5 pt-0.5">
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 font-sans">Open:</span>
                <span className="font-semibold text-slate-100">₹{(data[hoveredIndex].open ?? data[hoveredIndex].price).toFixed(1)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 font-sans">Close:</span>
                <span className="font-semibold text-slate-100 font-sans">₹{(data[hoveredIndex].close ?? data[hoveredIndex].price).toFixed(1)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 font-sans text-emerald-400">High:</span>
                <span className="font-semibold text-emerald-400 font-sans">₹{(data[hoveredIndex].high ?? data[hoveredIndex].price).toFixed(1)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 font-sans text-rose-400">Low:</span>
                <span className="font-semibold text-rose-400 font-sans font-sans">₹{(data[hoveredIndex].low ?? data[hoveredIndex].price).toFixed(1)}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400">Price:</span>
              <span className="text-emerald-400 font-extrabold text-xs">
                ₹{data[hoveredIndex].price.toFixed(2)}
              </span>
            </div>
          )}
          {showSma5 && data[hoveredIndex].sma5 !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-amber-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-amber-400 rounded-full" />
                SMA 5:
              </span>
              <span className="font-bold text-amber-300">₹{data[hoveredIndex].sma5.toFixed(2)}</span>
            </div>
          )}
          {showSma15 && data[hoveredIndex].sma15 !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-purple-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-purple-400 rounded-full" />
                SMA 15:
              </span>
              <span className="font-bold text-purple-300">₹{data[hoveredIndex].sma15.toFixed(2)}</span>
            </div>
          )}
          {showSma20 && data[hoveredIndex].sma20 !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-orange-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-orange-400 rounded-full" />
                SMA 20:
              </span>
              <span className="font-bold text-orange-300">₹{data[hoveredIndex].sma20.toFixed(2)}</span>
            </div>
          )}
          {showSma50 && data[hoveredIndex].sma50 !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 bg-blue-400 rounded-full" />
                SMA 50:
              </span>
              <span className="font-bold text-blue-300">₹{data[hoveredIndex].sma50.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
