import React, { useEffect } from 'react';
// Comment 1: Move relevantKeys to a module-level Set for performance
const RELEVANT_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Enter', 'Escape']);
import { motion } from 'framer-motion';
import { Search, Command } from 'lucide-react';
import { formatShortcutKey } from '@/lib/shortcuts/KeyboardShortcuts';
import { useCommandPalette } from '@ui/hooks/useCommandPalette';
import { CommandItem } from './CommandPalette/CommandItem';
import { Input } from '@ui/components/ui/input';
import { Dialog, DialogContent } from '@ui/components/ui/dialog';
import { Badge } from '@ui/components/ui/badge';
import { Separator } from '@ui/components/ui/separator';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  selectedChallenge: any;
}


export function CommandPalette({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  selectedChallenge,
}: CommandPaletteProps) {
  // Use extracted hook with fixed dependency issue
  const {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredCommands,
    groupedCommands,
  } = useCommandPalette({ selectedChallenge, onNavigate });

  // Keyboard navigation with global shortcuts coordination
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Comment 1: Use RELEVANT_KEYS Set for key lookup
      if (!RELEVANT_KEYS.has(e.key)) return;

      // Guard: do nothing if no commands
      if (filteredCommands.length === 0) return;

      // Only stop propagation for relevant keys
      e.stopPropagation();

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            filteredCommands.length === 0 ? 0 : Math.min(prev + 1, filteredCommands.length - 1)
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (filteredCommands.length === 0 ? 0 : Math.max(prev - 1, 0)));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Comment 2: Consolidate selectedIndex reset logic
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isOpen, filteredCommands.length]);

  // Comment 3: Clamp selectedIndex to valid range when filteredCommands changes
  useEffect(() => {
    if (filteredCommands.length === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(filteredCommands.length - 1);
    } else if (selectedIndex < 0) {
      setSelectedIndex(0);
    }
  }, [filteredCommands.length, selectedIndex]);

  // Reset query when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // ...existing code...

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-2xl p-0 border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl'>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className='flex flex-col max-h-[70vh]'
        >
          {/* Header */}
          <div className='flex items-center space-x-3 p-4 border-b border-border/30'>
            <div className='p-2 bg-primary/10 rounded-md'>
              <Command className='w-4 h-4 text-primary' />
            </div>
            <div className='flex-1'>
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder='Search commands...'
                className='border-none bg-transparent p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0'
                autoFocus
              />
            </div>
            <Badge variant='outline' className='text-xs font-mono'>
              {formatShortcutKey('k', ['ctrl'])}
            </Badge>
          </div>

          {/* Results */}
          <div className='flex-1 overflow-auto p-2'>
            {filteredCommands.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground'>
                <Search className='w-8 h-8 mx-auto mb-2 opacity-50' />
                <p>No commands found</p>
                <p className='text-sm'>Try a different search term</p>
              </div>
            ) : (
              <div className='space-y-4'>
                {Object.entries(groupedCommands).map(([section, sectionCommands]) => {
                  if (sectionCommands.length === 0) return null;

                  return (
                    <div key={section}>
                      <div className='px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                        {section === 'navigation'
                          ? 'Navigate'
                          : section === 'actions'
                            ? 'Actions'
                            : 'Help'}
                      </div>
                      <div className='space-y-1'>
                        {sectionCommands.map((command, sectionIndex) => {
                          const globalIndex = filteredCommands.indexOf(command);
                          return (
                            <CommandItem
                              key={command.id}
                              command={command}
                              index={globalIndex}
                              isSelected={globalIndex === selectedIndex}
                              onClick={() => {
                                command.action();
                                onClose();
                              }}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              onFocus={() => setSelectedIndex(globalIndex)}
                            />
                          );
                        })}
                      </div>
                      {section !== 'help' && <Separator className='my-2' />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='p-3 border-t border-border/30 bg-muted/20'>
            <div className='flex justify-between items-center text-xs text-muted-foreground'>
              <div className='flex items-center space-x-4'>
                <span className='flex items-center space-x-1'>
                  <kbd className='px-1.5 py-0.5 bg-muted rounded text-xs'>↑↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className='flex items-center space-x-1'>
                  <kbd className='px-1.5 py-0.5 bg-muted rounded text-xs'>↵</kbd>
                  <span>Select</span>
                </span>
              </div>
              <span className='flex items-center space-x-1'>
                <kbd className='px-1.5 py-0.5 bg-muted rounded text-xs'>Esc</kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
