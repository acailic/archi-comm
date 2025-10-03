/**
 * File: src/packages/ui/components/accessibility/ScreenReaderAnnouncer.tsx
 * Purpose: Provide ARIA live regions for screen reader announcements
 * Why: Makes canvas actions accessible to screen reader users
 * Related: src/packages/canvas/SimpleCanvas.tsx, src/packages/ui/components/DesignCanvas/DesignCanvasCore.tsx
 */

import { useEffect, useState, useCallback } from 'react';

interface ScreenReaderAnnouncerProps {
  message: string | null;
  priority?: 'polite' | 'assertive';
  clearDelay?: number;
}

export function ScreenReaderAnnouncer({
  message,
  priority = 'polite',
  clearDelay = 3000,
}: ScreenReaderAnnouncerProps) {
  const [politeMessage, setPoliteMessage] = useState<string>('');
  const [assertiveMessage, setAssertiveMessage] = useState<string>('');

  useEffect(() => {
    if (!message) return;

    if (priority === 'polite') {
      setPoliteMessage(message);
    } else {
      setAssertiveMessage(message);
    }

    const timer = setTimeout(() => {
      if (priority === 'polite') {
        setPoliteMessage('');
      } else {
        setAssertiveMessage('');
      }
    }, clearDelay);

    return () => clearTimeout(timer);
  }, [message, priority, clearDelay]);

  return (
    <>
      {/* Polite announcements - won't interrupt current speech */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive announcements - will interrupt current speech */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </>
  );
}

// Hook for easier usage
export function useScreenReaderAnnouncer() {
  const [message, setMessage] = useState<string | null>(null);
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback(
    (msg: string, msgPriority: 'polite' | 'assertive' = 'polite') => {
      setMessage(msg);
      setPriority(msgPriority);

      // Clear message after a brief moment to allow re-announcement of same message
      setTimeout(() => setMessage(null), 100);
    },
    []
  );

  const AnnouncerComponent = (
    <ScreenReaderAnnouncer message={message} priority={priority} />
  );

  return { announce, AnnouncerComponent };
}
