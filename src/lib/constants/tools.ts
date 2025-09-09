import { MousePointer2, Hand, ZoomIn, MessageSquare } from 'lucide-react';
import type { ToolType } from '@/shared/contracts';

export interface ToolConfig {
  id: ToolType;
  name: string;
  icon: React.ComponentType;
  description: string;
  shortcut: string;
}

export const CANVAS_TOOLS: ToolConfig[] = [
  {
    id: 'select' as ToolType,
    name: 'Select',
    icon: MousePointer2,
    description: 'Select and move components',
    shortcut: 'V',
  },
  {
    id: 'pan' as ToolType,
    name: 'Pan',
    icon: Hand,
    description: 'Pan around the canvas',
    shortcut: 'H',
  },
  {
    id: 'zoom' as ToolType,
    name: 'Zoom',
    icon: ZoomIn,
    description: 'Zoom in and out',
    shortcut: 'Z',
  },
  {
    id: 'annotate' as ToolType,
    name: 'Annotate',
    icon: MessageSquare,
    description: 'Add annotations',
    shortcut: 'A',
  },
];

// Helper function to get tool by id
export const getToolById = (id: ToolType): ToolConfig | undefined => {
  return CANVAS_TOOLS.find(tool => tool.id === id);
};

// Helper function to get tool names
export const getToolNames = (): string[] => {
  return CANVAS_TOOLS.map(tool => tool.name);
};

// Helper function to get all tool shortcuts
export const getToolShortcuts = (): Record<string, ToolType> => {
  return CANVAS_TOOLS.reduce(
    (acc, tool) => {
      acc[tool.shortcut.toLowerCase()] = tool.id;
      return acc;
    },
    {} as Record<string, ToolType>
  );
};
