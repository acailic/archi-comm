import { useEffect, useId, useMemo, useRef, useState, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, Search } from 'lucide-react';

import { formatShortcutKey } from '@/lib/shortcuts/KeyboardShortcuts';
import { useAnnouncer, useFocusManagement } from '@/shared/hooks/useAccessibility';
import { useCommandPalette } from '@ui/hooks/useCommandPalette.tsx';
import { Badge } from '@ui/components/ui/badge';
import { Dialog, DialogContent } from '@ui/components/ui/dialog';
import { Input } from '@ui/components/ui/input';
import { Separator } from '@ui/components/ui/separator';

import { CommandItem } from './CommandItem';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  selectedChallenge: unknown;
}

type CommandSection = 'navigation' | 'actions' | 'help';

const sectionLabels: Record<CommandSection, string> = {
  navigation: 'Navigate',
  actions: 'Actions',
  help: 'Help',
};

export function CommandPalette({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  selectedChallenge,
}: CommandPaletteProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { registerFocusTrap } = useFocusManagement();
  const announce = useAnnouncer();
  const [activeDescendant, setActiveDescendant] = useState<string | undefined>(undefined);

  const {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredCommands,
    groupedCommands,
  } = useCommandPalette({ selectedChallenge, onNavigate });

  const inputId = useId();
  const dialogTitleId = `${inputId}-label`;
  const helperTextId = `${inputId}-helper`;
  const listboxId = `${inputId}-listbox`;

  // Manage focus trapping when opened
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return;
    }

    const trapElement = containerRef.current;
    let release: (() => void) | undefined;

    if (trapElement) {
      release = registerFocusTrap(trapElement, { restoreFocus: true, focusFirst: false });
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }

    return () => {
      release?.();
    };
  }, [isOpen, registerFocusTrap]);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setActiveDescendant(undefined);
    }
  }, [isOpen, setQuery, setSelectedIndex]);

  // Clamp selected index when result set changes
  useEffect(() => {
    if (filteredCommands.length === 0) {
      setSelectedIndex(0);
      setActiveDescendant(undefined);
      return;
    }

    setSelectedIndex((prev) => {
      if (prev >= filteredCommands.length) {
        return filteredCommands.length - 1;
      }
      if (prev < 0) {
        return 0;
      }
      return prev;
    });
  }, [filteredCommands, setSelectedIndex]);

  // Announce the number of results to assistive tech users
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const count = filteredCommands.length;
    const message = count === 0 ? 'No commands available' : `${count} command${count === 1 ? '' : 's'} available`;
    announce(message, 'polite', 2000);
  }, [announce, filteredCommands.length, isOpen]);

  // Update aria-activedescendant when selection changes
  useEffect(() => {
    const current = filteredCommands[selectedIndex];
    if (current) {
      setActiveDescendant(`${listboxId}-${current.id}`);
    } else {
      setActiveDescendant(undefined);
    }
  }, [filteredCommands, listboxId, selectedIndex]);

  const visibleSections = useMemo(() => Object.entries(groupedCommands) as [CommandSection, typeof filteredCommands][], [groupedCommands]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (filteredCommands.length === 0 && event.key !== 'Escape') {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prev) => (filteredCommands.length === 0 ? 0 : Math.min(prev + 1, filteredCommands.length - 1)));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((prev) => (filteredCommands.length === 0 ? 0 : Math.max(prev - 1, 0)));
        break;
      case 'Enter': {
        if (filteredCommands[selectedIndex]) {
          event.preventDefault();
          filteredCommands[selectedIndex].action();
          announce(`${filteredCommands[selectedIndex].title} activated`, 'assertive', 1500);
          onClose();
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent
            ref={containerRef}
            className='max-w-2xl p-0 border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl'
            role='dialog'
            aria-modal='true'
            aria-labelledby={dialogTitleId}
            aria-describedby={helperTextId}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -12 }}
              transition={{ duration: 0.18 }}
              className='flex flex-col max-h-[70vh]'
            >
              <div className='flex items-center space-x-3 p-4 border-b border-border/30'>
                <div className='p-2 bg-primary/10 rounded-md' aria-hidden='true'>
                  <Command className='w-4 h-4 text-primary' />
                </div>
                <div className='flex-1'>
                  <label htmlFor={inputId} id={dialogTitleId} className='sr-only'>
                    Command palette
                  </label>
                  <Input
                    ref={inputRef}
                    id={inputId}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder='Search commands'
                    className='border-none bg-transparent p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0'
                    onKeyDown={handleKeyDown}
                    role='combobox'
                    aria-expanded={filteredCommands.length > 0}
                    aria-controls={listboxId}
                    aria-activedescendant={activeDescendant}
                    aria-describedby={helperTextId}
                    autoComplete='off'
                    autoCapitalize='none'
                    spellCheck={false}
                  />
                </div>
                <Badge variant='outline' className='text-xs font-mono' aria-hidden='true'>
                  {formatShortcutKey('k', ['ctrl'])}
                </Badge>
              </div>

              <div className='px-4 py-2 text-xs text-muted-foreground' id={helperTextId}>
                Use the arrow keys to navigate and Enter to run a command.
              </div>

              <div className='flex-1 overflow-auto px-2 pb-4' role='presentation'>
                {filteredCommands.length === 0 ? (
                  <div className='text-center py-10 text-muted-foreground'>
                    <Search className='w-8 h-8 mx-auto mb-2 opacity-50' aria-hidden='true' />
                    <p>No commands found</p>
                    <p className='text-sm'>Try searching for a different term.</p>
                  </div>
                ) : (
                  <ul id={listboxId} role='listbox' aria-label='Command results' className='space-y-4'>
                    {visibleSections.map(([section, commands]) => {
                      if (!commands.length) {
                        return null;
                      }

                      return (
                        <li key={section} className='list-none'>
                          <div className='px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                            {sectionLabels[section]}
                          </div>
                          <div className='space-y-1'>
                            {commands.map((command) => {
                              const globalIndex = filteredCommands.indexOf(command);
                              const optionId = `${listboxId}-${command.id}`;

                              return (
                                <CommandItem
                                  key={command.id}
                                  optionId={optionId}
                                  command={command}
                                  index={globalIndex}
                                  isSelected={globalIndex === selectedIndex}
                                  onClick={() => {
                                    command.action();
                                    announce(`${command.title} activated`, 'assertive', 1500);
                                    onClose();
                                  }}
                                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                                  onFocus={() => setSelectedIndex(globalIndex)}
                                />
                              );
                            })}
                          </div>
                          {section !== 'help' && <Separator className='my-2' />}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

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
                <div className='mt-2 text-[11px] text-muted-foreground'>
                  You are currently on the {currentScreen} screen.
                </div>
              </div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

export type { CommandPaletteProps };
