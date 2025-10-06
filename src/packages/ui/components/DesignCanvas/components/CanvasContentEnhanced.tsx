/**
 * src/packages/ui/components/DesignCanvas/components/CanvasContentEnhanced.tsx
 * Enhanced version of CanvasContent with all new usability components integrated
 * Provides alignment toolbar, selection box, group overlays, and search functionality
 * RELEVANT FILES: src/stores/canvasStore.ts, src/packages/ui/components/canvas/AlignmentToolbar.tsx
 */

import { AlignmentGuides } from "@ui/components/canvas/AlignmentGuides";
import { AlignmentToolbar } from "@ui/components/canvas/AlignmentToolbar";
import { ComponentGroupOverlay } from "@ui/components/canvas/ComponentGroupOverlay";
import { SelectionBox } from "@ui/components/canvas/SelectionBox";
import { ComponentPaletteSearch } from "@ui/components/panels/ComponentPaletteSearch";
import React, { useCallback, useState } from "react";

import {
  useComponentGroups,
  useSelectedComponentIds,
} from "@/stores/canvasStore";

interface CanvasContentEnhancedProps {
  children: React.ReactNode;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export const CanvasContentEnhanced = React.memo<CanvasContentEnhancedProps>(
  ({ children, viewport = { x: 0, y: 0, zoom: 1 } }) => {
    const selectedIds = useSelectedComponentIds();
    const groups = useComponentGroups();
    const [searchCategories] = useState([
      { id: "server", name: "Servers", count: 12 },
      { id: "database", name: "Databases", count: 8 },
      { id: "cache", name: "Caching", count: 5 },
      { id: "queue", name: "Queues", count: 6 },
      { id: "api-gateway", name: "API Gateways", count: 4 },
      { id: "load-balancer", name: "Load Balancers", count: 3 },
    ]);

    const handleViewportChange = useCallback(
      (newViewport: { x: number; y: number; zoom: number }) => {
        // Update viewport state for overlays
        // This would be connected to ReactFlow's onViewportChange
      },
      [],
    );

    return (
      <div className="relative w-full h-full">
        {/* Main canvas content */}
        <div className="relative flex-1">
          {children}

          {/* Selection Box Overlay */}
          <SelectionBox />

          {/* Component Group Overlays */}
          <ComponentGroupOverlay viewport={viewport} />

          {/* Alignment Guides */}
          <AlignmentGuides viewport={viewport} />
        </div>

        {/* Alignment Toolbar (shown when components selected) */}
        <AlignmentToolbar className="absolute top-20 left-1/2 -translate-x-1/2" />

        {/* Component Palette with Search (in sidebar) */}
        <div className="absolute top-4 left-4 w-64">
          <ComponentPaletteSearch
            categories={searchCategories}
            className="mb-4"
          />
        </div>

        {/* Keyboard Shortcut Hints */}
        {selectedIds.length > 0 && (
          <div className="absolute bottom-4 right-4 bg-white border-2 border-gray-900 rounded-lg shadow-lg p-3">
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">
                  Ctrl+D
                </kbd>
                <span className="text-gray-600">Duplicate</span>
              </div>
              {selectedIds.length >= 2 && (
                <>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">
                      Ctrl+G
                    </kbd>
                    <span className="text-gray-600">Group</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">
                      Ctrl+Shift+↑
                    </kbd>
                    <span className="text-gray-600">Align</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">
                  Ctrl+L
                </kbd>
                <span className="text-gray-600">Lock</span>
              </div>
            </div>
          </div>
        )}

        {/* Status indicators */}
        {groups.length > 0 && (
          <div className="absolute top-4 right-4 bg-purple-50 border border-purple-200 rounded-lg p-2">
            <span className="text-xs text-purple-700 font-medium">
              {groups.length} group{groups.length !== 1 ? "s" : ""} active
            </span>
          </div>
        )}
      </div>
    );
  },
);

CanvasContentEnhanced.displayName = "CanvasContentEnhanced";
