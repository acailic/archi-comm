import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Target,
  Palette,
  Mic,
  Eye,
  RotateCcw,
  Save,
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

interface UseCommandPaletteProps {
  selectedChallenge: any;
  onNavigate: (screen: string) => void;
  onClose?: () => void;
}

export function useCommandPalette({ selectedChallenge, onNavigate, onClose }: UseCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shortcutsVersion, setShortcutsVersion] = useState(getShortcutsVersion());

  // Update shortcuts version periodically
  useEffect(() => {
    const id = setInterval(() => setShortcutsVersion(getShortcutsVersion()), 1000);
    return () => clearInterval(id);
  }, []);

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
  }, [selectedChallenge, onNavigate, shortcutsVersion]);

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

  return {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredCommands,
    groupedCommands,
  };
}