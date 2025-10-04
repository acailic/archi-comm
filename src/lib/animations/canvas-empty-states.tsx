// src/lib/animations/canvas-empty-states.tsx
// Beautiful empty state illustrations and components for the canvas and panels
// Provides inspiring, actionable empty states instead of blank screens
// RELEVANT FILES: src/lib/design/design-system.ts, src/packages/ui/components/overlays/WelcomeOverlay.tsx

import { motion } from 'framer-motion';
import { FileQuestion, Inbox, Lightbulb, MousePointer, Search, Sparkles } from 'lucide-react';
import { Button } from '@/packages/ui/components/ui/button';

// Empty canvas illustration
export function EmptyCanvasIllustration() {
  return (
    <motion.svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Canvas outline */}
      <motion.rect
        x="20"
        y="20"
        width="160"
        height="160"
        rx="8"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeDasharray="8 4"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
      />

      {/* Sparkles */}
      {[
        { x: 40, y: 40, delay: 0.5 },
        { x: 160, y: 60, delay: 0.7 },
        { x: 100, y: 140, delay: 0.9 },
      ].map((sparkle, i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
          transition={{
            duration: 2,
            delay: sparkle.delay,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        >
          <circle cx={sparkle.x} cy={sparkle.y} r="3" fill="#3b82f6" />
        </motion.g>
      ))}

      {/* Plus icon in center */}
      <motion.g
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <circle cx="100" cy="100" r="30" fill="#eff6ff" />
        <path
          d="M100 80 L100 120 M80 100 L120 100"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </motion.g>
    </motion.svg>
  );
}

// Main empty canvas state component
interface EmptyCanvasStateProps {
  onBrowseTemplates?: () => void;
  onQuickAdd?: () => void;
}

export function EmptyCanvasState({ onBrowseTemplates, onQuickAdd }: EmptyCanvasStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-6 p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <EmptyCanvasIllustration />

      <motion.div
        className="text-center space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h3 className="text-xl font-semibold text-gray-900">
          Your next big idea starts here
        </h3>
        <p className="text-sm text-gray-600 max-w-md">
          Drag components from the palette or press <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 text-xs font-mono">Cmd+K</kbd> to quick add
        </p>
      </motion.div>

      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Button onClick={onBrowseTemplates} variant="default">
          <Sparkles className="w-4 h-4 mr-2" />
          Browse Templates
        </Button>
        <Button onClick={onQuickAdd} variant="outline">
          Quick Add
        </Button>
      </motion.div>

      <motion.p
        className="text-xs text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        Tip: Use arrow keys to navigate between components
      </motion.p>
    </motion.div>
  );
}

// Generic empty panel state
interface EmptyPanelStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyPanelState({ icon, title, description, action }: EmptyPanelStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-4 p-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {icon && (
        <motion.div
          className="text-gray-400"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {icon}
        </motion.div>
      )}

      <div className="space-y-1">
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>

      {action && (
        <Button onClick={action.onClick} variant="outline" size="sm">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

// Specific empty state variants
export function EmptyComponentsState() {
  return (
    <EmptyPanelState
      icon={<Inbox className="w-12 h-12" />}
      title="No components yet"
      description="Add components from the palette to get started"
    />
  );
}

export function EmptyConnectionsState() {
  return (
    <EmptyPanelState
      icon={<MousePointer className="w-12 h-12" />}
      title="No connections yet"
      description="Drag from connection handles to link components"
    />
  );
}

export function EmptySearchState() {
  return (
    <EmptyPanelState
      icon={<Search className="w-12 h-12" />}
      title="No results found"
      description="Try adjusting your search terms"
    />
  );
}

export function EmptyHintsState() {
  return (
    <EmptyPanelState
      icon={<Lightbulb className="w-12 h-12" />}
      title="Hints will appear as you work"
      description="We'll suggest improvements as you build your architecture"
    />
  );
}

export function EmptyPropertiesState({ onAddComponent }: { onAddComponent?: () => void }) {
  return (
    <EmptyPanelState
      icon={<FileQuestion className="w-12 h-12" />}
      title="No component selected"
      description="Click a component on the canvas to view and edit its properties"
      action={
        onAddComponent
          ? {
              label: 'Add Component',
              onClick: onAddComponent,
            }
          : undefined
      }
    />
  );
}
