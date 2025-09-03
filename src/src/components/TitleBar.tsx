import { Minus, Square, X } from 'lucide-react';
import { useWindow } from '../lib/hooks/useTauri';
import { Button } from './ui/button';

interface TitleBarProps {
  title?: string;
  showControls?: boolean;
}

export const TitleBar = ({ title = 'ArchiComm', showControls = true }: TitleBarProps) => {
  const { minimize, maximize, close, isRunningInTauri } = useWindow();

  // Only render the custom title bar when running in Tauri
  if (!isRunningInTauri) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between bg-background border-b border-border px-4 py-2 select-none"
      data-tauri-drag-region
    >
      {/* Left side - App title */}
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-primary rounded-sm" />
        <span className="font-semibold text-sm">{title}</span>
      </div>

      {/* Right side - Window controls */}
      {showControls && (
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={minimize}
            title="Minimize"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={maximize}
            title="Maximize"
          >
            <Square className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
            onClick={close}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};