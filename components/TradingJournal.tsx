'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import { 
  BookOpen, 
  PenSquare, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Calendar, 
  Tag, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  NotebookPen, 
  ChevronRight, 
  Share2,
  Trash
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface JournalEntry {
  id: string;
  ticker: string;
  stockName: string;
  note: string;
  category: 'Analysis' | 'Buy Setup' | 'Sell Setup' | 'Post-Mortem' | 'General';
  sentiment: 'Bullish' | 'Bearish' | 'Neutral';
  createdAt: string;
  updatedAt?: string;
  priceAtEntry: number;
}

export default function TradingJournal() {
  const { selectedTicker, stocks } = useStockContext();
  const stock = stocks.find(s => s.ticker === selectedTicker);

  // States
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<JournalEntry['category']>('Analysis');
  const [sentiment, setSentiment] = useState<JournalEntry['sentiment']>('Neutral');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('All');
  
  // Load notes from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('quant_trading_journal_entries');
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to parse trading journal entries', err);
      }
    }
  }, []);

  // Save notes to localStorage whenever they change
  const saveEntriesToLocalStorage = (newEntries: JournalEntry[]) => {
    setEntries(newEntries);
    localStorage.setItem('quant_trading_journal_entries', JSON.stringify(newEntries));
  };

  // Filtered entries for the active stock
  const currentStockEntries = useMemo(() => {
    if (!selectedTicker) return [];
    return entries
      .filter(entry => entry.ticker === selectedTicker)
      .filter(entry => filterCategory === 'All' || entry.category === filterCategory)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [entries, selectedTicker, filterCategory]);

  // Handle Note Submission (Add / Edit)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicker || !stock || !note.trim()) return;

    if (editingId) {
      // Update existing entry
      const updated = entries.map(entry => {
        if (entry.id === editingId) {
          return {
            ...entry,
            note: note.trim(),
            category,
            sentiment,
            updatedAt: new Date().toISOString()
          };
        }
        return entry;
      });
      saveEntriesToLocalStorage(updated);
      setEditingId(null);
    } else {
      // Create new entry
      const newEntry: JournalEntry = {
        id: Math.random().toString(36).substring(2, 9),
        ticker: selectedTicker,
        stockName: stock.name,
        note: note.trim(),
        category,
        sentiment,
        createdAt: new Date().toISOString(),
        priceAtEntry: stock.currentPrice
      };
      saveEntriesToLocalStorage([newEntry, ...entries]);
    }

    // Reset inputs
    setNote('');
    setCategory('Analysis');
    setSentiment('Neutral');
  };

  // Trigger editing mode
  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setNote(entry.note);
    setCategory(entry.category);
    setSentiment(entry.sentiment);
  };

  // Cancel edit mode
  const cancelEdit = () => {
    setEditingId(null);
    setNote('');
    setCategory('Analysis');
    setSentiment('Neutral');
  };

  // Delete an entry
  const deleteEntry = (id: string) => {
    if (window.confirm('Are you sure you want to delete this trading journal entry?')) {
      const filtered = entries.filter(entry => entry.id !== id);
      saveEntriesToLocalStorage(filtered);
      if (editingId === id) {
        cancelEdit();
      }
    }
  };

  if (!stock) return null;

  // Custom pill styling for category
  const getCategoryClass = (cat: JournalEntry['category']) => {
    switch (cat) {
      case 'Buy Setup':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30';
      case 'Sell Setup':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30';
      case 'Analysis':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30';
      case 'Post-Mortem':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-200 dark:border-purple-900/30';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
    }
  };

  // Custom text for sentiment label
  const getSentimentLabel = (sent: JournalEntry['sentiment']) => {
    switch (sent) {
      case 'Bullish':
        return { text: 'Bullish Bias', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/10' };
      case 'Bearish':
        return { text: 'Bearish Bias', icon: TrendingDown, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/30 border border-rose-500/10' };
      default:
        return { text: 'Neutral Bias', icon: Clock, color: 'text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700' };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-4" id="trading-journal-card-container">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 shrink-0">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
              Tactical Trading Journal
              <span className="text-[8px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-black font-sans">JOURNAL ENGINE</span>
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Log trade reasoning, macro biases, and strategic setups for {stock.ticker}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Form: Add / Edit Entry (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleSubmit} className="p-4 bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 rounded-xl space-y-4" id="trading-journal-input-form">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <NotebookPen className="h-3 w-3" /> {editingId ? 'Edit Journal Entry' : 'New Journal Entry'}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-[9px] font-mono font-bold text-rose-500 hover:underline flex items-center gap-0.5"
                >
                  <X className="h-3 w-3" /> Cancel Edit
                </button>
              )}
            </div>

            {/* Note Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="journal-note-input" className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                Reasoning / Trade Plan
              </label>
              <textarea
                id="journal-note-input"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Log your setups, key chart patterns, support breakout, RSI indicators, or core triggers for planning this trade..."
                className="w-full p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-400 leading-relaxed resize-none"
                required
              />
            </div>

            {/* Selection Options (Category & Sentiment Bias) */}
            <div className="grid grid-cols-2 gap-3">
              
              {/* Category */}
              <div className="space-y-1.5">
                <label htmlFor="journal-category-select" className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                  Setup Type
                </label>
                <select
                  id="journal-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as JournalEntry['category'])}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Analysis">Analysis</option>
                  <option value="Buy Setup">Buy Setup</option>
                  <option value="Sell Setup">Sell Setup</option>
                  <option value="Post-Mortem">Post-Mortem</option>
                  <option value="General">General Notes</option>
                </select>
              </div>

              {/* Sentiment Bias */}
              <div className="space-y-1.5">
                <label htmlFor="journal-sentiment-select" className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                  Sentiment Bias
                </label>
                <select
                  id="journal-sentiment-select"
                  value={sentiment}
                  onChange={(e) => setSentiment(e.target.value as JournalEntry['sentiment'])}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Neutral">Neutral Bias</option>
                  <option value="Bullish">Bullish Bias</option>
                  <option value="Bearish">Bearish Bias</option>
                </select>
              </div>

            </div>

            {/* Active Pricing context tag */}
            <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 flex items-center justify-between pt-1">
              <span>ACTIVE PRICE CONTEXT:</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">₹{stock.currentPrice.toFixed(2)}</span>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              id="btn-save-journal"
            >
              {editingId ? (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Update Journal Entry</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log to Trading Journal</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right timeline/logs (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          
          {/* List Headers & Category filter toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-800 pb-2">
            <span className="text-[10px] font-mono font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Logged Timeline ({currentStockEntries.length})
            </span>

            {/* Simple Category Filtering list */}
            <div className="flex flex-wrap items-center gap-1 text-[9px] font-bold">
              {['All', 'Analysis', 'Buy Setup', 'Sell Setup', 'Post-Mortem'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2 py-1 rounded transition-all cursor-pointer ${
                    filterCategory === cat
                      ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/10'
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline entries list */}
          <div className="flex-1 overflow-y-auto max-h-[340px] pr-1 space-y-3 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800" id="journal-entries-timeline">
            <AnimatePresence mode="popLayout">
              {currentStockEntries.length > 0 ? (
                currentStockEntries.map((entry) => {
                  const bias = getSentimentLabel(entry.sentiment);
                  const BiasIcon = bias.icon;
                  const dateStr = new Date(entry.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      className="group bg-gray-50/30 dark:bg-gray-950/10 border border-gray-200/40 dark:border-gray-800/50 hover:border-gray-300 dark:hover:border-gray-800 rounded-xl p-4 transition-all relative space-y-2.5"
                    >
                      {/* Entry line metadata header */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${getCategoryClass(entry.category)}`}>
                            {entry.category}
                          </span>
                          
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1 ${bias.color}`}>
                            <BiasIcon className="h-2.5 w-2.5" />
                            <span>{bias.text}</span>
                          </span>
                        </div>

                        {/* Interactive edit / delete tools */}
                        <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(entry)}
                            className="p-1 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                            title="Edit entry"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1 rounded text-gray-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                            title="Delete entry"
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Entry Note Reasoning Content */}
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed font-sans whitespace-pre-line">
                        {entry.note}
                      </p>

                      {/* Footer time stats */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100/50 dark:border-gray-800/50">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{dateStr}</span>
                          {entry.updatedAt && (
                            <span className="text-[8px] text-gray-300 dark:text-gray-600 uppercase">(edited)</span>
                          )}
                        </div>
                        <div className="font-bold">
                          PRICE RECORDED: <span className="text-gray-700 dark:text-gray-300">₹{entry.priceAtEntry.toFixed(2)}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  key="empty-timeline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center text-xs text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center space-y-2"
                >
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200/40 dark:border-gray-800 rounded-full text-gray-400 dark:text-gray-500">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold">Journal Timeline Empty</p>
                    <p className="text-gray-400 dark:text-gray-500 text-[11px]">No matching notes found for {stock.ticker} in your trading journal.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Strategy Insight info footer */}
          <div className="bg-indigo-50/5 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/20 rounded-xl p-3">
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1 mb-1">
              <Check className="h-3.5 w-3.5 text-indigo-500" /> Journal Protocol Checklist
            </span>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Writing down entries enforces discipline and stops FOMO. Consistent logs help you review technical pattern success and track strategy execution over time.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
