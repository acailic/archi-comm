/**
 * File: src/packages/ui/components/canvas/ConnectionFeedback.tsx
 * Purpose: Provide visual feedback during connection creation
 * Why: Makes connection creation intuitive with validation messages and hints
 * Related: src/packages/canvas/utils/connection-validation.ts, src/packages/canvas/SimpleCanvas.tsx
 */

import { useMemo } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { DesignComponent, Connection } from '../../../../shared/contracts';
import {
  validateConnection,
  getConnectionValidationMessage,
} from '../../../canvas/utils/connection-validation';

interface ConnectionFeedbackProps {
  connectionStart: string | null;
  hoveredComponent: string | null;
  components: DesignComponent[];
  connections: Connection[];
  cursorPosition: { x: number; y: number } | null;
}

export function ConnectionFeedback({
  connectionStart,
  hoveredComponent,
  components,
  connections,
  cursorPosition,
}: ConnectionFeedbackProps) {
  // Calculate validation result for hovered component
  const validationResult = useMemo(() => {
    if (!connectionStart || !hoveredComponent) {
      return null;
    }

    return validateConnection(
      connectionStart,
      hoveredComponent,
      connections,
      components
    );
  }, [connectionStart, hoveredComponent, connections, components]);

  // Don't render if connection mode is not active
  if (!connectionStart || !cursorPosition) {
    return null;
  }

  // Get hovered component details
  const hoveredComp = components.find((c) => c.id === hoveredComponent);

  return (
    <div className="pointer-events-none fixed inset-0 z-[var(--z-tooltip)]">
      {/* Cursor tooltip */}
      <div
        className="absolute bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 shadow-lg text-sm"
        style={{
          left: cursorPosition.x + 15,
          top: cursorPosition.y + 15,
          maxWidth: '300px',
        }}
      >
        {!hoveredComponent && (
          <div className="text-gray-600 dark:text-gray-300">
            Click a component to connect
          </div>
        )}

        {hoveredComponent && validationResult && (
          <div className="flex items-start gap-2">
            {validationResult.valid ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-900 dark:text-gray-100 font-medium">
                    Click to connect to
                  </div>
                  <div className="text-gray-600 dark:text-gray-300">
                    {hoveredComp?.label || 'Component'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-gray-900 dark:text-gray-100 font-medium">
                    Cannot connect
                  </div>
                  <div className={`text-sm ${validationResult.severity === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {validationResult.reason}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Validation indicator near hovered component */}
      {hoveredComponent && validationResult && hoveredComp && (
        <div
          className="absolute flex items-center gap-2 bg-white dark:bg-gray-800 border rounded-lg px-2 py-1 shadow-md"
          style={{
            left: hoveredComp.x + 50,
            top: hoveredComp.y - 30,
          }}
        >
          {validationResult.valid ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
          )}
          <span className={`text-xs font-medium ${validationResult.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {validationResult.valid ? 'Valid' : validationResult.severity === 'warning' ? 'Warning' : 'Invalid'}
          </span>
        </div>
      )}
    </div>
  );
}
