import React, { useState, useEffect, useMemo } from 'react';
// Comment 1: Move relevantKeys to a module-level Set for performance
const RELEVANT_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Enter', 'Escape']);
import { motion } from 'framer-motion';
import {
  Search,
  Target,
  Palette,
  Mic,
  Eye,
  RotateCcw,
  Save,
  ArrowRight,
  Command,
  Settings,
  HelpCircle,
  Keyboard,
  Star,
} from 'lucide-react';
import {
  getAllShortcuts,
  formatShortcutKey,
  getShortcutsVersion,
} from '@/lib/shortcuts/KeyboardShortcuts';
import { Input } from './ui/input';
import { Dialog, DialogContent } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  selectedChallenge: any;
}

interface CommandData {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  section: 'navigation' | 'actions' | 'help';
  shortcut?: string;
  available?: boolean;
}

// Comment 4: Extract CommandItem outside main component and memoize
interface CommandItemProps {
  command: CommandData;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onFocus: () => void;
}

const CommandItem = React.memo(
  ({ command, index, isSelected, onClick, onMouseEnter, onFocus }: CommandItemProps) => {
    const Icon = command.icon;
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
        className={`
        p-3 rounded-lg cursor-pointer transition-all duration-200 group
        ${isSelected ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-muted/50'}
      `}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onFocus={onFocus}
        tabIndex={0}
        role='option'
        aria-selected={isSelected}
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div
              className={`
            p-2 rounded-md transition-all duration-200
            ${
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground'
            }
          `}
            >
              <Icon className='w-4 h-4' />
            </div>
            <div>
              <div
                className={`font-medium transition-colors ${isSelected ? 'text-primary' : 'text-foreground'}`}
              >
                {command.title}
              </div>
              <div className='text-sm text-muted-foreground'>{command.description}</div>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            {command.shortcut && (
              <Badge variant='outline' className='text-xs font-mono'>
                {command.shortcut}
              </Badge>
            )}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <ArrowRight className='w-4 h-4 text-primary' />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

export function CommandPalette({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  selectedChallenge,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandData[] = useMemo(() => {
    const allShortcuts = getAllShortcuts();
    const getShortcutDisplay = (description: string) => {
      const shortcut = allShortcuts.find(s =>
        s.description.toLowerCase().includes(description.toLowerCase())
      );
      return shortcut ? formatShortcutKey(shortcut.key, shortcut.modifiers) : undefined;
    };

    return [
      // Navigation Commands
      {
        id: 'nav-pro-version',
        title: 'Upgrade to Pro',
        description: 'Access premium features, advanced AI, and exclusive content',
        icon: Star,
        action: () => onNavigate('pro-version'),
        section: 'navigation',
        shortcut: undefined,
        available: true,
      },
      {
        id: 'nav-challenges',
        title: 'Select Challenge',
        description: 'Choose a system design challenge to practice',
        icon: Target,
        action: () => onNavigate('challenge-selection'),
        section: 'navigation',
        shortcut: getShortcutDisplay('challenge selection'),
        available: true,
      },
      {
        id: 'nav-design',
        title: 'Design Canvas',
        description: 'Create your system architecture',
        icon: Palette,
        action: () => onNavigate('design-canvas'),
        section: 'navigation',
        shortcut: getShortcutDisplay('design canvas'),
        available: !!selectedChallenge,
      },
      {
        id: 'nav-recording',
        title: 'Record Explanation',
        description: 'Practice your technical communication',
        icon: Mic,
        action: () => onNavigate('audio-recording'),
        section: 'navigation',
        shortcut: getShortcutDisplay('audio recording'),
        available: !!selectedChallenge,
      },
      {
        id: 'nav-review',
        title: 'Session Review',
        description: 'Analyze your performance and get feedback',
        icon: Eye,
        action: () => onNavigate('review'),
        section: 'navigation',
        shortcut: getShortcutDisplay('review'),
        available: !!selectedChallenge,
      },
      {
        id: 'nav-config',
        title: 'Configuration',
        description: 'Adjust canvas and app settings',
        icon: Settings,
        action: () => onNavigate('config'),
        section: 'navigation',
        shortcut: undefined,
        available: true,
      },

      // Action Commands
      {
        id: 'action-new-session',
        title: 'New Session',
        description: 'Start a fresh practice session',
        icon: RotateCcw,
        action: () => {
          onNavigate('challenge-selection');
          // Add logic to reset session
        },
        section: 'actions',
        shortcut: getShortcutDisplay('new project'),
        available: true,
      },
      {
        id: 'action-save',
        title: 'Save Session',
        description: 'Save your current progress',
        icon: Save,
        action: () => {
          window.dispatchEvent(new CustomEvent('shortcut:save-project'));
        },
        section: 'actions',
        shortcut: getShortcutDisplay('save project'),
        available: !!selectedChallenge,
      },
      {
        id: 'action-ai-settings',
        title: 'AI Settings',
        description: 'Configure AI provider settings and API keys',
        icon: Settings,
        action: () => {
          window.dispatchEvent(new CustomEvent('shortcut:ai-settings'));
        },
        section: 'actions',
        shortcut: getShortcutDisplay('AI Settings'),
        available: true,
      },

      // Help Commands
      {
        id: 'help-shortcuts',
        title: 'Keyboard Shortcuts',
        description: 'View all available keyboard shortcuts',
        icon: Keyboard,
        action: () => {
          window.dispatchEvent(new CustomEvent('shortcut:show-help'));
        },
        section: 'help',
        shortcut: getShortcutDisplay('show shortcuts help'),
        available: true,
      },
      {
        id: 'help-guide',
        title: 'User Guide',
        description: 'Learn how to use ArchiComm effectively',
        icon: HelpCircle,
        action: () => {
          // Add user guide logic
          console.log('Opening user guide...');
        },
        section: 'help',
        available: true,
      },
    ];
  }, [selectedChallenge, onNavigate, getShortcutsVersion()]);

  // Comment 5: Precompute lower-case trimmed query for filtering
  const filteredCommands = useMemo(() => {
    const available = commands.filter(cmd => cmd.available !== false);
    const q = query.trim().toLowerCase();
    if (!q) return available;

    // Lightweight fuzzy ranking without external deps
    const score = (text: string, query: string) => {
      text = text.toLowerCase();
      if (text.includes(query)) return 0; // best
      // simple subsequence match score
      let ti = 0, qi = 0, gaps = 0;
      while (ti < text.length && qi < query.length) {
        if (text[ti] === query[qi]) {
          qi++;
        } else {
          gaps++;
        }
        ti++;
      }
      return qi === query.length ? gaps + (text.length - query.length) : Infinity;
    };

    const weighted = available
      .map(cmd => {
        const sTitle = score(cmd.title, q);
        const sDesc = score(cmd.description, q);
        const s = Math.min(sTitle, sDesc + 2); // description slightly less important
        return { cmd, s };
      })
      .filter(r => r.s !== Infinity)
      .sort((a, b) => a.s - b.s)
      .map(r => r.cmd);

    // Fallback to basic filtering if fuzzy yields nothing
    return weighted.length
      ? weighted
      : available.filter(
          c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
        );
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandData[]> = {
      navigation: [],
      actions: [],
      help: [],
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.section].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

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
