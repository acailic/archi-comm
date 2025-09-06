/**
 * ArchiComm Shortcuts Overlay - Modern Help System
 * Beautiful and intuitive keyboard shortcuts reference
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Keyboard, Zap } from 'lucide-react';
import { 
  getAllShortcuts, 
  getShortcutsByCategory, 
  formatShortcutKey, 
  type ShortcutConfig, 
  type ShortcutCategory 
} from '../../lib/shortcuts/KeyboardShortcuts';

interface ShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryIcons: Record<ShortcutCategory, React.ReactNode> = {
  general: <Zap size={20} className="text-blue-500" />,
  canvas: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="text-purple-500">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="9" cy="9" r="2" fill="currentColor"/>
    <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" stroke="currentColor" strokeWidth="2"/>
  </svg>,
  components: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="text-green-500">
    <rect x="4" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="4" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="4" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
    <rect x="14" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
  </svg>,
  navigation: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="text-orange-500">
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" stroke="currentColor" strokeWidth="2"/>
    <path d="M13 13l6 6" stroke="currentColor" strokeWidth="2"/>
  </svg>,
  project: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="text-indigo-500">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v11z" stroke="currentColor" strokeWidth="2"/>
  </svg>,
  system: <svg width={20} height={20} viewBox="0 0 24 24" fill="none" className="text-red-500">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1" stroke="currentColor" strokeWidth="2"/>
  </svg>
};

const categoryLabels: Record<ShortcutCategory, string> = {
  general: 'General',
  canvas: 'Canvas',
  components: 'Components',
  navigation: 'Navigation',
  project: 'Project',
  system: 'System'
};

export const ShortcutsOverlay: React.FC<ShortcutsOverlayProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'all'>('all');
  const [shortcuts, setShortcuts] = useState<ShortcutConfig[]>([]);

  useEffect(() => {
    if (isOpen) {
      setShortcuts(getAllShortcuts());
    }
  }, [isOpen]);

  const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesSearch = shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shortcut.key.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories: (ShortcutCategory | 'all')[] = ['all', 'general', 'canvas', 'components', 'navigation', 'project', 'system'];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Overlay Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-8 lg:inset-12 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                  <Keyboard size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Keyboard Shortcuts
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Master ArchiComm with these productivity shortcuts
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Search and Filter */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search shortcuts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    data-keyboard-ignore="true"
                    autoFocus
                  />
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                        selectedCategory === category
                          ? 'bg-blue-500 text-white shadow-lg'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {category !== 'all' && categoryIcons[category as ShortcutCategory]}
                      <span className="text-sm font-medium">
                        {category === 'all' ? 'All' : categoryLabels[category as ShortcutCategory]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Shortcuts List */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredShortcuts.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredShortcuts.map((shortcut, index) => (
                    <motion.div
                      key={`${shortcut.key}-${shortcut.modifiers?.join('-')}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {categoryIcons[shortcut.category]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {shortcut.description}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {categoryLabels[shortcut.category]}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0">
                        <kbd className="inline-flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-mono text-sm border border-gray-300 dark:border-gray-600 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                          {formatShortcutKey(shortcut.key, shortcut.modifiers)}
                        </kbd>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                    <Search size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No shortcuts found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center">
                    Try adjusting your search terms or category filter
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span>{filteredShortcuts.length} shortcuts</span>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline">Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded font-mono">Esc</kbd> to close</span>
                </div>
                <div className="text-xs">
                  ArchiComm v1.0.0
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// React hook to manage shortcuts overlay
export const useShortcutsOverlay = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleShowHelp = () => setIsOpen(true);
    
    window.addEventListener('shortcut:show-help', handleShowHelp);
    return () => window.removeEventListener('shortcut:show-help', handleShowHelp);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen)
  };
};