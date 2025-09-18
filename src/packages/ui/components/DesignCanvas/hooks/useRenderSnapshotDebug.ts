import { useRef } from 'react';

interface RenderSnapshotParams {
  components: any[];
  connections: any[];
  infoCards: any[];
  selectedComponent: string | null;
  challengeId: string;
  isSynced: boolean;
  renderGuard: {
    renderCount: number;
    sincePreviousRenderMs: number;
    sinceFirstRenderMs: number;
  };
  lastRenderSnapshotRef: React.MutableRefObject<{
    componentsLength: number;
    connectionsLength: number;
    infoCardsLength: number;
    selectedComponent: string | null;
    challengeId: string;
    isSynced: boolean;
  } | null>;
}

export function useRenderSnapshotDebug({
  components,
  connections,
  infoCards,
  selectedComponent,
  challengeId,
  isSynced,
  renderGuard,
  lastRenderSnapshotRef,
}: RenderSnapshotParams) {
  if (process.env.NODE_ENV !== 'production') {
    const snapshot = {
      componentsLength: components.length,
      connectionsLength: connections.length,
      infoCardsLength: infoCards.length,
      selectedComponent,
      challengeId,
      isSynced,
    };
    const previousSnapshot = lastRenderSnapshotRef.current;

    if (previousSnapshot) {
      const changes: Record<string, unknown> = {};

      if (previousSnapshot.componentsLength !== snapshot.componentsLength) {
        changes.componentsLength = {
          previous: previousSnapshot.componentsLength,
          next: snapshot.componentsLength,
        };
      }

      if (previousSnapshot.connectionsLength !== snapshot.connectionsLength) {
        changes.connectionsLength = {
          previous: previousSnapshot.connectionsLength,
          next: snapshot.connectionsLength,
        };
      }

      if (previousSnapshot.infoCardsLength !== snapshot.infoCardsLength) {
        changes.infoCardsLength = {
          previous: previousSnapshot.infoCardsLength,
          next: snapshot.infoCardsLength,
        };
      }

      if (previousSnapshot.selectedComponent !== snapshot.selectedComponent) {
        changes.selectedComponent = {
          previous: previousSnapshot.selectedComponent,
          next: snapshot.selectedComponent,
        };
      }

      if (previousSnapshot.isSynced !== snapshot.isSynced) {
        changes.isSynced = {
          previous: previousSnapshot.isSynced,
          next: snapshot.isSynced,
        };
      }

      if (Object.keys(changes).length > 0) {
        console.debug(
          `[DesignCanvasCore] render #${renderGuard.renderCount} (prop changes)`,
          {
            changes,
            sincePreviousRenderMs: renderGuard.sincePreviousRenderMs,
            sinceFirstRenderMs: renderGuard.sinceFirstRenderMs,
          }
        );
      }
    }

    lastRenderSnapshotRef.current = snapshot;
  }
}