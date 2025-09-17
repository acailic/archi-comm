import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getGlobalShortcutManager,
  ShortcutAction,
  ShortcutCategory,
} from '@/lib/shortcuts/KeyboardShortcuts';
import {
  ShortcutLearningSystem,
  ShortcutUsageMetrics,
  LearningRecommendation,
} from '@/lib/shortcuts/ShortcutLearningSystem';
import { Button } from './ui/button';

interface ShortcutCustomizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface ShortcutConflict {
  existingShortcut: ShortcutAction;
  newShortcut: ShortcutAction;
  combination: string;
}

interface ShortcutScheme {
  id: string;
  name: string;
  description: string;
  shortcuts: Partial<Record<string, string>>;
}

const SHORTCUT_SCHEMES: ShortcutScheme[] = [
  {
    id: 'default',
    name: 'ArchiComm Default',
    description: 'Standard ArchiComm shortcuts',
    shortcuts: {},
  },
  {
    id: 'vscode',
    name: 'VS Code Style',
    description: 'Shortcuts similar to Visual Studio Code',
    shortcuts: {
      copy: 'Ctrl+C',
      paste: 'Ctrl+V',
      undo: 'Ctrl+Z',
      redo: 'Ctrl+Y',
      save: 'Ctrl+S',
      find: 'Ctrl+F',
    },
  },
  {
    id: 'figma',
    name: 'Figma Style',
    description: 'Shortcuts similar to Figma',
    shortcuts: {
      copy: 'Ctrl+C',
      paste: 'Ctrl+V',
      duplicate: 'Ctrl+D',
      group: 'Ctrl+G',
      frame: 'F',
      text: 'T',
    },
  },
];

export const ShortcutCustomizationPanel: React.FC<ShortcutCustomizationPanelProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  const [shortcuts, setShortcuts] = useState<ShortcutAction[]>([]);
  const [filteredShortcuts, setFilteredShortcuts] = useState<ShortcutAction[]>([]);
  const [usageMetrics, setUsageMetrics] = useState<ShortcutUsageMetrics[]>([]);
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [recordingKeys, setRecordingKeys] = useState(false);
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<ShortcutConflict[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeScheme, setActiveScheme] = useState('default');

  const panelRef = useRef<HTMLDivElement>(null);
  const recordingInputRef = useRef<HTMLInputElement>(null);

  const shortcutManager = getGlobalShortcutManager();
  const learningSystem = ShortcutLearningSystem.getInstance();

  // Load data
  useEffect(() => {
    if (isOpen) {
      loadShortcutsData();
    }
  }, [isOpen]);

  const loadShortcutsData = useCallback(() => {
    if (!shortcutManager) return;

    const allShortcuts = shortcutManager.getAllShortcuts();
    const metrics = learningSystem.getShortcutAnalytics();
    const recs = learningSystem.getLearningRecommendations();

    setShortcuts(allShortcuts);
    setUsageMetrics(metrics);
    setRecommendations(recs);
  }, [shortcutManager]);

  // Filter shortcuts
  useEffect(() => {
    let filtered = shortcuts;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(shortcut => shortcut.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        shortcut =>
          shortcut.description.toLowerCase().includes(query) ||
          shortcut.combination.toLowerCase().includes(query) ||
          shortcut.id.toLowerCase().includes(query)
      );
    }

    setFilteredShortcuts(filtered);
  }, [shortcuts, selectedCategory, searchQuery]);

  // Key recording
  const startRecording = (shortcutId: string) => {
    setEditingShortcut(shortcutId);
    setRecordingKeys(true);
    setCurrentKeys([]);
    setConflicts([]);

    setTimeout(() => {
      recordingInputRef.current?.focus();
    }, 100);
  };

  const stopRecording = () => {
    setRecordingKeys(false);
    setCurrentKeys([]);

    if (recordingInputRef.current) {
      recordingInputRef.current.blur();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!recordingKeys || !editingShortcut) return;

    event.preventDefault();
    event.stopPropagation();

    const keys: string[] = [];

    if (event.ctrlKey || event.metaKey) keys.push(event.metaKey ? 'Cmd' : 'Ctrl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');

    if (event.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
      keys.push(event.key.toUpperCase());
    }

    if (keys.length > 0) {
      setCurrentKeys(keys);

      // Check for conflicts
      const combination = keys.join('+');
      const existingShortcut = shortcuts.find(
        s => s.combination === combination && s.id !== editingShortcut
      );

      if (existingShortcut) {
        const editingShortcutData = shortcuts.find(s => s.id === editingShortcut)!;
        setConflicts([
          {
            existingShortcut,
            newShortcut: editingShortcutData,
            combination,
          },
        ]);
      } else {
        setConflicts([]);
      }
    }
  };

  const saveShortcut = () => {
    if (!editingShortcut || currentKeys.length === 0 || !shortcutManager) return;

    const combination = currentKeys.join('+');

    // Handle conflicts
    if (conflicts.length > 0) {
      const conflictResolution = window.confirm(
        `The combination "${combination}" is already used by "${conflicts[0].existingShortcut.description}". Do you want to replace it?`
      );

      if (!conflictResolution) {
        stopRecording();
        setEditingShortcut(null);
        return;
      }

      // Clear the conflicting shortcut
      shortcutManager.updateShortcut(conflicts[0].existingShortcut.id, { combination: '' });
    }

    // Update the shortcut
    shortcutManager.updateShortcut(editingShortcut, { combination });

    // Update local state
    setShortcuts(shortcutManager.getAllShortcuts());

    stopRecording();
    setEditingShortcut(null);
  };

  const resetShortcut = (shortcutId: string) => {
    if (!shortcutManager) return;
    shortcutManager.resetShortcut(shortcutId);
    setShortcuts(shortcutManager.getAllShortcuts());
  };

  const applyScheme = (schemeId: string) => {
    const scheme = SHORTCUT_SCHEMES.find(s => s.id === schemeId);
    if (!scheme || !shortcutManager) return;

    // Apply scheme shortcuts
    Object.entries(scheme.shortcuts).forEach(([shortcutId, combination]) => {
      shortcutManager.updateShortcut(shortcutId, { combination });
    });

    setActiveScheme(schemeId);
    setShortcuts(shortcutManager.getAllShortcuts());
  };

  const exportShortcuts = () => {
    const data = {
      shortcuts: shortcuts.map(s => ({ id: s.id, combination: s.combination })),
      scheme: activeScheme,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'archicomm-shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importShortcuts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string);

        if (data.shortcuts && Array.isArray(data.shortcuts) && shortcutManager) {
          data.shortcuts.forEach((shortcut: { id: string; combination: string }) => {
            shortcutManager.updateShortcut(shortcut.id, { combination: shortcut.combination });
          });

          if (data.scheme) {
            setActiveScheme(data.scheme);
          }

          setShortcuts(shortcutManager.getAllShortcuts());
        }
      } catch (error) {
        console.error('Failed to import shortcuts:', error);
        alert('Failed to import shortcuts. Please check the file format.');
      }
    };
    reader.readAsText(file);

    // Reset the input
    event.target.value = '';
  };

  const getMetricsForShortcut = (shortcutId: string): ShortcutUsageMetrics | null => {
    return usageMetrics.find(m => m.shortcutId === shortcutId) || null;
  };

  const formatTimeSaved = (milliseconds: number): string => {
    if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;
    if (milliseconds < 60000) return `${Math.round(milliseconds / 1000)}s`;
    return `${Math.round(milliseconds / 60000)}m`;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape' && !recordingKeys) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, recordingKeys, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const firstFocusable = panelRef.current.querySelector(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;

      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
        onClick={e => e.target === e.currentTarget && !recordingKeys && onClose()}
      >
        <motion.div
          ref={panelRef}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className='flex items-center justify-between p-6 border-b border-gray-200'>
            <div>
              <h2 className='text-xl font-semibold text-gray-900'>Keyboard Shortcuts</h2>
              <p className='text-sm text-gray-600 mt-1'>Customize and learn keyboard shortcuts</p>
            </div>

            <div className='flex items-center space-x-2'>
              <Button variant='outline' size='sm' onClick={() => setShowAnalytics(!showAnalytics)}>
                {showAnalytics ? 'Hide' : 'Show'} Analytics
              </Button>

              <Button
                variant='ghost'
                size='sm'
                onClick={onClose}
                aria-label='Close shortcuts panel'
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className='p-6 border-b border-gray-200 space-y-4'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center space-x-4'>
                {/* Category filter */}
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value as ShortcutCategory | 'all')}
                  className='px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value='all'>All Categories</option>
                  <option value='navigation'>Navigation</option>
                  <option value='editing'>Editing</option>
                  <option value='view'>View</option>
                  <option value='tools'>Tools</option>
                  <option value='workflow'>Workflow</option>
                </select>

                {/* Search */}
                <input
                  type='text'
                  placeholder='Search shortcuts...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>

              {/* Scheme selector */}
              <div className='flex items-center space-x-2'>
                <label className='text-sm text-gray-600'>Scheme:</label>
                <select
                  value={activeScheme}
                  onChange={e => applyScheme(e.target.value)}
                  className='px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  {SHORTCUT_SCHEMES.map(scheme => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Import/Export */}
            <div className='flex items-center space-x-2'>
              <Button variant='outline' size='sm' onClick={exportShortcuts}>
                Export
              </Button>

              <label className='cursor-pointer'>
                <Button variant='outline' size='sm' as='span'>
                  Import
                </Button>
                <input type='file' accept='.json' onChange={importShortcuts} className='hidden' />
              </label>

              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  if (window.confirm('Reset all shortcuts to defaults?') && shortcutManager) {
                    shortcutManager.resetAllShortcuts();
                    setShortcuts(shortcutManager.getAllShortcuts());
                  }
                }}
              >
                Reset All
              </Button>
            </div>

            {/* Learning Recommendations */}
            {recommendations.length > 0 && (
              <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
                <h3 className='text-sm font-medium text-blue-900 mb-2'>Learning Recommendations</h3>
                <div className='space-y-2'>
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <div key={index} className='text-sm text-blue-800'>
                      <span className='font-medium'>{rec.title}:</span> {rec.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className='flex-1 overflow-auto max-h-96'>
            {showAnalytics ? (
              // Analytics View
              <div className='p-6 space-y-6'>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <div className='bg-gray-50 rounded-lg p-4'>
                    <div className='text-2xl font-bold text-gray-900'>{usageMetrics.length}</div>
                    <div className='text-sm text-gray-600'>Shortcuts Used</div>
                  </div>

                  <div className='bg-gray-50 rounded-lg p-4'>
                    <div className='text-2xl font-bold text-gray-900'>
                      {formatTimeSaved(
                        usageMetrics.reduce(
                          (sum, m) => sum + m.averageTimeSaved * m.successfulUsageCount,
                          0
                        )
                      )}
                    </div>
                    <div className='text-sm text-gray-600'>Time Saved</div>
                  </div>

                  <div className='bg-gray-50 rounded-lg p-4'>
                    <div className='text-2xl font-bold text-gray-900'>
                      {usageMetrics.length > 0
                        ? Math.round(
                            (usageMetrics.reduce((sum, m) => sum + m.adoptionRate, 0) /
                              usageMetrics.length) *
                              100
                          )
                        : 0}
                      %
                    </div>
                    <div className='text-sm text-gray-600'>Success Rate</div>
                  </div>

                  <div className='bg-gray-50 rounded-lg p-4'>
                    <div className='text-2xl font-bold text-gray-900'>
                      {learningSystem.getLearningProgress().skillLevel}
                    </div>
                    <div className='text-sm text-gray-600'>Skill Level</div>
                  </div>
                </div>

                {/* Top shortcuts */}
                <div>
                  <h3 className='text-lg font-medium text-gray-900 mb-4'>Most Used Shortcuts</h3>
                  <div className='space-y-2'>
                    {usageMetrics
                      .sort((a, b) => b.totalUsageCount - a.totalUsageCount)
                      .slice(0, 10)
                      .map(metric => {
                        const shortcut = shortcuts.find(s => s.id === metric.shortcutId);
                        if (!shortcut) return null;

                        return (
                          <div
                            key={metric.shortcutId}
                            className='flex items-center justify-between p-3 bg-gray-50 rounded'
                          >
                            <div className='flex items-center space-x-3'>
                              <code className='px-2 py-1 bg-gray-200 rounded text-sm'>
                                {shortcut.combination || 'Not set'}
                              </code>
                              <span className='text-sm'>{shortcut.description}</span>
                            </div>
                            <div className='text-sm text-gray-600'>
                              {metric.totalUsageCount} uses •{' '}
                              {formatTimeSaved(
                                metric.averageTimeSaved * metric.successfulUsageCount
                              )}{' '}
                              saved
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              // Shortcuts List
              <div className='p-6'>
                <div className='space-y-2'>
                  {filteredShortcuts.map(shortcut => {
                    const metrics = getMetricsForShortcut(shortcut.id);
                    const isEditing = editingShortcut === shortcut.id;

                    return (
                      <div
                        key={shortcut.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isEditing
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className='flex items-center space-x-4 flex-1'>
                          {/* Shortcut combination */}
                          <div className='w-32'>
                            {isEditing && recordingKeys ? (
                              <div className='space-y-2'>
                                <input
                                  ref={recordingInputRef}
                                  className='w-full px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none'
                                  placeholder='Press keys...'
                                  value={currentKeys.join('+')}
                                  onKeyDown={handleKeyDown}
                                  readOnly
                                />
                                {conflicts.length > 0 && (
                                  <div className='text-xs text-red-600'>
                                    Conflicts with: {conflicts[0].existingShortcut.description}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <code className='px-2 py-1 bg-gray-100 rounded text-sm'>
                                {shortcut.combination || 'Not set'}
                              </code>
                            )}
                          </div>

                          {/* Description */}
                          <div className='flex-1'>
                            <div className='text-sm font-medium text-gray-900'>
                              {shortcut.description}
                            </div>
                            <div className='text-xs text-gray-500'>{shortcut.category}</div>
                          </div>

                          {/* Analytics */}
                          {metrics && (
                            <div className='text-xs text-gray-500 text-right'>
                              <div>{metrics.totalUsageCount} uses</div>
                              <div>{Math.round(metrics.adoptionRate * 100)}% success</div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className='flex items-center space-x-2 ml-4'>
                          {isEditing && recordingKeys ? (
                            <>
                              <Button
                                size='sm'
                                onClick={saveShortcut}
                                disabled={currentKeys.length === 0}
                              >
                                Save
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  stopRecording();
                                  setEditingShortcut(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => startRecording(shortcut.id)}
                              >
                                Edit
                              </Button>

                              {shortcut.combination && (
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => resetShortcut(shortcut.id)}
                                  title='Reset to default'
                                >
                                  ↻
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredShortcuts.length === 0 && (
                  <div className='text-center py-8 text-gray-500'>
                    No shortcuts found matching your criteria.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recording overlay */}
          {recordingKeys && (
            <div className='absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center'>
              <div className='bg-white rounded-lg p-6 shadow-xl'>
                <h3 className='text-lg font-medium mb-2'>Recording Key Combination</h3>
                <p className='text-sm text-gray-600 mb-4'>
                  Press the key combination you want to use for this shortcut.
                </p>
                <div className='text-center'>
                  <code className='text-lg px-4 py-2 bg-gray-100 rounded'>
                    {currentKeys.length > 0 ? currentKeys.join('+') : 'Press keys...'}
                  </code>
                </div>
                <div className='mt-4 text-center'>
                  <Button variant='outline' size='sm' onClick={stopRecording}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ShortcutCustomizationPanel;
