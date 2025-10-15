/**
 * src/packages/canvas/hooks/useSmartConnectors.ts
 * React hook that wires smart routing utilities into ReactFlow edge rendering.
 * Computes smart paths when the smart routing toggle is enabled.
 *
 * RELEVANT FILES:
 * - src/packages/canvas/components/EdgeLayer.tsx
 * - src/packages/canvas/utils/smart-routing.ts
 * - src/stores/canvasStore.ts (smartRouting flag)
 */

import { useMemo } from "react";
import { shallow } from "zustand/shallow";

import type { Connection } from "@/shared/contracts";
import { useCanvasStore } from "@/stores/canvasStore";

import {
  buildSmartRoutes,
  type SmartRouteResult,
  type SmartRoutingOptions,
} from "../utils/smart-routing";

export const useSmartConnectors = (
  connections: Connection[],
  options?: SmartRoutingOptions,
) => {
  const { smartRoutingEnabled, components, updateVersion } = useCanvasStore(
    (state) => ({
      smartRoutingEnabled: state.smartRouting,
      components: state.components,
      updateVersion: state.updateVersion,
    }),
    shallow,
  );

  return useMemo<Map<string, SmartRouteResult>>(() => {
    if (!smartRoutingEnabled || connections.length === 0) {
      return new Map();
    }

    return buildSmartRoutes(connections, components, {
      avoidOverlaps: true,
      padding: options?.padding,
      algorithm: options?.algorithm ?? "auto",
    });
  }, [
    smartRoutingEnabled,
    connections,
    components,
    updateVersion,
    options?.algorithm,
    options?.padding,
  ]);
};

