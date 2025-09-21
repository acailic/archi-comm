import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface FocusTrapOptions {
  restoreFocus?: boolean;
  focusFirst?: boolean;
}

interface KeyboardShortcut {
  key: string;
  preventDefault?: boolean;
  allowInInputs?: boolean;
  modifiers?: {
    alt?: boolean;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
  };
}

interface AccessibilityContextValue {
  announce: (message: string, politeness?: 'polite' | 'assertive', ttl?: number) => void;
  focusElement: (target: string | HTMLElement | null) => void;
  registerFocusTrap: (element: HTMLElement | null, options?: FocusTrapOptions) => () => void;
  registerShortcut: (shortcut: KeyboardShortcut, handler: (event: KeyboardEvent) => void) => () => void;
}

interface FocusTrapState {
  element: HTMLElement;
  previousActive: HTMLElement | null;
  options: FocusTrapOptions;
  handler: (event: KeyboardEvent) => void;
}

interface ShortcutState {
  id: symbol;
  shortcut: KeyboardShortcut;
  handler: (event: KeyboardEvent) => void;
}

const hiddenLiveRegionStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  border: 0,
};

const isTextInput = (element: EventTarget | null): boolean => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const tag = element.tagName.toLowerCase();
  const editable = element.getAttribute('contenteditable');
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    editable === '' ||
    editable === 'true'
  );
};

const getFocusableElements = (root: HTMLElement): HTMLElement[] => {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ];
  const elements = Array.from(
    root.querySelectorAll<HTMLElement>(focusableSelectors.join(','))
  );
  return elements.filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
  );
};

const matchesShortcut = (event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  const { modifiers } = shortcut;
  if (modifiers) {
    if (modifiers.alt === true && !event.altKey) return false;
    if (modifiers.alt === false && event.altKey) return false;
    if (modifiers.ctrl === true && !event.ctrlKey) return false;
    if (modifiers.ctrl === false && event.ctrlKey) return false;
    if (modifiers.meta === true && !event.metaKey) return false;
    if (modifiers.meta === false && event.metaKey) return false;
    if (modifiers.shift === true && !event.shiftKey) return false;
    if (modifiers.shift === false && event.shiftKey) return false;
  }

  return true;
};

export const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);
AccessibilityContext.displayName = 'AccessibilityContext';

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const focusTrapStack = useRef<FocusTrapState[]>([]);
  const shortcutsRef = useRef<Map<symbol, ShortcutState>>(new Map());

  const politeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assertiveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const clearTimeoutRef = useCallback((ref: typeof politeTimeoutRef) => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);

  const announce = useCallback<AccessibilityContextValue['announce']>(
    (message, politeness = 'polite', ttl = 4000) => {
      if (typeof window === 'undefined') {
        return;
      }

      if (politeness === 'assertive') {
        clearTimeoutRef(assertiveTimeoutRef);
        setAssertiveMessage('');
        requestAnimationFrame(() => setAssertiveMessage(message));
        assertiveTimeoutRef.current = setTimeout(() => {
          setAssertiveMessage('');
        }, ttl);
      } else {
        clearTimeoutRef(politeTimeoutRef);
        setPoliteMessage('');
        requestAnimationFrame(() => setPoliteMessage(message));
        politeTimeoutRef.current = setTimeout(() => {
          setPoliteMessage('');
        }, ttl);
      }
    },
    [clearTimeoutRef]
  );

  const focusElement = useCallback<AccessibilityContextValue['focusElement']>((target) => {
    if (typeof document === 'undefined' || !target) {
      return;
    }

    const element = typeof target === 'string' ? document.getElementById(target) : target;
    if (!element) {
      return;
    }

    if (typeof element.focus === 'function') {
      element.focus({ preventScroll: false });
    }
  }, []);

  const registerFocusTrap = useCallback<AccessibilityContextValue['registerFocusTrap']>(
    (element, options = {}) => {
      if (!element || typeof document === 'undefined') {
        return () => {};
      }

      const previousActive = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const trapState: FocusTrapState = {
        element,
        previousActive,
        options,
        handler: () => {},
      };

      const keydownHandler = (event: KeyboardEvent) => {
        const activeTrap = focusTrapStack.current[focusTrapStack.current.length - 1];
        if (activeTrap?.element !== element || event.key !== 'Tab') {
          return;
        }

        const focusable = getFocusableElements(element);
        if (focusable.length === 0) {
          event.preventDefault();
          element.focus();
          return;
        }

        const currentIndex = focusable.indexOf(event.target as HTMLElement);
        const direction = event.shiftKey ? -1 : 1;
        let nextIndex = currentIndex + direction;

        if (nextIndex < 0) {
          nextIndex = focusable.length - 1;
          event.preventDefault();
          focusable[nextIndex].focus();
        } else if (nextIndex >= focusable.length) {
          nextIndex = 0;
          event.preventDefault();
          focusable[nextIndex].focus();
        }
      };

      trapState.handler = keydownHandler;

      element.addEventListener('keydown', keydownHandler, true);
      focusTrapStack.current.push(trapState);

      if (options.focusFirst !== false) {
        const focusable = getFocusableElements(element);
        (focusable[0] ?? element).focus();
      }

      return () => {
        element.removeEventListener('keydown', keydownHandler, true);
        focusTrapStack.current = focusTrapStack.current.filter((trap) => trap !== trapState);
        if (options.restoreFocus !== false && trapState.previousActive && typeof trapState.previousActive.focus === 'function') {
          trapState.previousActive.focus({ preventScroll: false });
        }
      };
    },
    []
  );

  const registerShortcut = useCallback<AccessibilityContextValue['registerShortcut']>(
    (shortcut, handler) => {
      const id = Symbol(shortcut.key);
      shortcutsRef.current.set(id, { id, shortcut, handler });
      return () => {
        shortcutsRef.current.delete(id);
      };
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (shortcutsRef.current.size === 0) {
        return;
      }

      shortcutsRef.current.forEach(({ shortcut, handler }) => {
        if (!shortcut.allowInInputs && isTextInput(event.target)) {
          return;
        }

        if (!matchesShortcut(event, shortcut)) {
          return;
        }

        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }

        handler(event);
      });
    };

    window.addEventListener('keydown', handleKeydown, true);
    return () => {
      window.removeEventListener('keydown', handleKeydown, true);
    };
  }, []);

  useEffect(() => () => clearTimeoutRef(politeTimeoutRef), [clearTimeoutRef]);
  useEffect(() => () => clearTimeoutRef(assertiveTimeoutRef), [clearTimeoutRef]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({ announce, focusElement, registerFocusTrap, registerShortcut }),
    [announce, focusElement, registerFocusTrap, registerShortcut]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={hiddenLiveRegionStyle}
        data-testid="accessibility-announcer-polite"
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        style={hiddenLiveRegionStyle}
        data-testid="accessibility-announcer-assertive"
      >
        {assertiveMessage}
      </div>
    </AccessibilityContext.Provider>
  );
}
