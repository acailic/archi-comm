import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllShortcuts, formatShortcutKey, globalShortcutManager, getShortcutsVersion } from '../lib/shortcuts/KeyboardShortcuts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent } from './ui/dialog';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Search,
  Target,
  Palette,
  Mic,
  Eye,
  RotateCcw,
  Save,
  Download,
  ArrowRight,
  Command,
  Zap,
  Settings,
  HelpCircle,
  Keyboard
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  onNavigate: (screen: string) => void;
  selectedChallenge: any;
}

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  section: 'navigation' | 'actions' | 'help';
  shortcut?: string;
  available?: boolean;
}

export function CommandPalette({ 
  isOpen, 
  onClose, 
  currentScreen, 
  onNavigate, 
  selectedChallenge 
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = useMemo(() => {
    const allShortcuts = getAllShortcuts();
    const getShortcutDisplay = (description: string) => {
      const shortcut = allShortcuts.find(s => s.description.toLowerCase().includes(description.toLowerCase()));
      return shortcut ? formatShortcutKey(shortcut.key, shortcut.modifiers) : undefined;
    };

    return [
      // Navigation Commands
      {
        id: 'nav-challenges',
        title: 'Select Challenge',
        description: 'Choose a system design challenge to practice',
        icon: Target,
        action: () => onNavigate('challenge-selection'),
        section: 'navigation',
        shortcut: getShortcutDisplay('challenge selection'),
        available: true
      },
      {
        id: 'nav-design',
        title: 'Design Canvas',
        description: 'Create your system architecture',
        icon: Palette,
        action: () => onNavigate('design-canvas'),
        section: 'navigation',
        shortcut: getShortcutDisplay('design canvas'),
        available: !!selectedChallenge
      },
      {
        id: 'nav-recording',
        title: 'Record Explanation',
        description: 'Practice your technical communication',
        icon: Mic,
        action: () => onNavigate('audio-recording'),
        section: 'navigation',
        shortcut: getShortcutDisplay('audio recording'),
        available: !!selectedChallenge
      },
      {
        id: 'nav-review',
        title: 'Session Review',
        description: 'Analyze your performance and get feedback',
        icon: Eye,
        action: () => onNavigate('review'),
        section: 'navigation',
        shortcut: getShortcutDisplay('review'),
        available: !!selectedChallenge
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
        available: true
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
        available: !!selectedChallenge
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
        available: true
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
        available: true
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
        available: true
      }
    ];
  }, [selectedChallenge, onNavigate, getShortcutsVersion()]);

  const filteredCommands = useMemo(() => {
    const availableCommands = commands.filter(cmd => cmd.available !== false);
    
    if (!query.trim()) {
      return availableCommands;
    }
    
    return availableCommands.filter(cmd => 
      cmd.title.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
    );
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {
      navigation: [],
      actions: [],
      help: []
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
      // Prevent global shortcuts from interfering when palette is open
      e.stopPropagation();
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
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

    // Use capture phase to ensure higher precedence than global shortcuts
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Reset query when closing
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const CommandItem = ({ command, index }: { command: Command; index: number }) => {
    const isSelected = index === selectedIndex;
    const Icon = command.icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
        className={`
          p-3 rounded-lg cursor-pointer transition-all duration-200 group
          ${isSelected 
            ? 'bg-primary/10 border-l-2 border-primary' 
            : 'hover:bg-muted/50'
          }
        `}
        onClick={() => {
          command.action();
          onClose();
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`
              p-2 rounded-md transition-all duration-200
              ${isSelected 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground'
              }
            `}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className={`font-medium transition-colors ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                {command.title}
              </div>
              <div className="text-sm text-muted-foreground">
                {command.description}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {command.shortcut && (
              <Badge variant="outline" className="text-xs font-mono">
                {command.shortcut}
              </Badge>
            )}
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <ArrowRight className="w-4 h-4 text-primary" />
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col max-h-[70vh]"
        >
          {/* Header */}
          <div className="flex items-center space-x-3 p-4 border-b border-border/30">
            <div className="p-2 bg-primary/10 rounded-md">
              <Command className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands..."
                className="border-none bg-transparent p-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {formatShortcutKey('k', ['ctrl'])}
            </Badge>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No commands found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedCommands).map(([section, sectionCommands]) => {
                  if (sectionCommands.length === 0) return null;
                  
                  return (
                    <div key={section}>
                      <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {section === 'navigation' ? 'Navigate' : 
                         section === 'actions' ? 'Actions' : 'Help'}
                      </div>
                      <div className="space-y-1">
                        {sectionCommands.map((command, sectionIndex) => {
                          const globalIndex = filteredCommands.indexOf(command);
                          return (
                            <CommandItem
                              key={command.id}
                              command={command}
                              index={globalIndex}
                            />
                          );
                        })}
                      </div>
                      {section !== 'help' && <Separator className="my-2" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border/30 bg-muted/20">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↑↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">↵</kbd>
                  <span>Select</span>
                </span>
              </div>
              <span className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}