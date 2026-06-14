import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Command, LayoutDashboard, Users, Vote, Wallet, MessageSquare, Settings, User, Shield } from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, action: () => { navigate('/dashboard'); setOpen(false); } },
    { id: 'council', label: 'Executive Council', icon: Users, action: () => { navigate('/council'); setOpen(false); } },
    { id: 'governance', label: 'Governance', icon: Vote, action: () => { navigate('/governance'); setOpen(false); } },
    { id: 'earn', label: 'Earn', icon: Wallet, action: () => { navigate('/earn'); setOpen(false); } },
    { id: 'chat', label: 'Encrypted Chat', icon: MessageSquare, action: () => { navigate('/chat'); setOpen(false); } },
    { id: 'profile', label: 'Profile', icon: User, action: () => { navigate('/profile'); setOpen(false); } },
    { id: 'admin', label: 'Admin', icon: Shield, action: () => { navigate('/admin'); setOpen(false); } },
    { id: 'settings', label: 'Settings', icon: Settings, action: () => { navigate('/profile'); setOpen(false); } },
  ];

  const filtered = query.trim()
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  // Toggle with Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[selectedIndex]?.action();
    }
  }, [filtered, selectedIndex]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh]"
        onClick={() => setOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
            <Search className="w-5 h-5 text-slate-500" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
              placeholder="Search pages and actions..."
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
            />
            <button
              onClick={() => setOpen(false)}
              className="p-1 hover:bg-slate-800 rounded text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No results found
              </div>
            ) : (
              filtered.map((cmd, i) => (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === selectedIndex
                      ? 'bg-blue-600/10 text-blue-400'
                      : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <cmd.icon className="w-4 h-4" />
                  <span className="flex-1 text-sm">{cmd.label}</span>
                  {i === selectedIndex && (
                    <span className="text-[10px] text-slate-500">Enter</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Enter</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
