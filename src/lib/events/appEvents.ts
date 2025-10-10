const isDev =
  typeof process !== "undefined" &&
  typeof process.env !== "undefined" &&
  process.env.NODE_ENV !== "production";

export interface QuickAddShortcutDetail {
  query?: string;
  position?: { x: number; y: number };
  forceOpen?: boolean;
  forceClose?: boolean;
  source?: string;
}

export interface QuickAddOverlayStateDetail {
  active?: boolean;
}

export interface CanvasFitBoundsDetail {
  x: number;
  y: number;
  width: number;
  height: number;
  padding?: number;
  source?: string;
}

export interface CanvasModeChangedDetail {
  mode: string;
  source?: string;
}

export type WorkflowRecommendationDetail = unknown;

export interface CanvasAddComponentDetail {
  componentType: string;
  position?: { x: number; y: number };
  source?: string;
}

export interface FirstComponentAddedDetail {
  componentId: string | null;
}

export const APP_EVENT = {
  SHORTCUT_QUICK_ADD: "shortcut:quick-add-component",
  QUICK_ADD_OVERLAY_OPEN: "quick-add-overlay:open",
  QUICK_ADD_OVERLAY_OPENED: "quick-add-overlay:opened",
  QUICK_ADD_OVERLAY_CLOSE: "quick-add-overlay:close",
  QUICK_ADD_OVERLAY_CLOSED: "quick-add-overlay:closed",
  QUICK_ADD_OVERLAY_STATE: "quick-add-overlay:state",
  CANVAS_ZOOM_IN: "canvas:zoom-in",
  CANVAS_ZOOM_OUT: "canvas:zoom-out",
  CANVAS_FIT_VIEW: "canvas:fit-view",
  CANVAS_FIT_BOUNDS: "canvas:fit-bounds",
  CANVAS_AUTO_LAYOUT: "canvas:auto-layout",
  CANVAS_MODE_CHANGED: "canvas:mode-changed",
  CANVAS_ADD_COMPONENT: "canvas:add-component",
  CANVAS_FIRST_COMPONENT_ADDED: "canvas:first-component-added",
  SHOW_PATTERN_LIBRARY: "show-pattern-library",
  KEYBOARD_SHORTCUTS_OPEN: "open-keyboard-shortcuts",
  WORKFLOW_RECOMMENDATION_SELECTED: "workflow:recommendation-selected",
} as const;

export type AppEventName = (typeof APP_EVENT)[keyof typeof APP_EVENT];

export type AppEventPayloads = {
  [APP_EVENT.SHORTCUT_QUICK_ADD]: QuickAddShortcutDetail | undefined;
  [APP_EVENT.QUICK_ADD_OVERLAY_OPEN]: QuickAddShortcutDetail | undefined;
  [APP_EVENT.QUICK_ADD_OVERLAY_OPENED]: QuickAddShortcutDetail | undefined;
  [APP_EVENT.QUICK_ADD_OVERLAY_CLOSE]: QuickAddShortcutDetail | undefined;
  [APP_EVENT.QUICK_ADD_OVERLAY_CLOSED]: QuickAddShortcutDetail | undefined;
  [APP_EVENT.QUICK_ADD_OVERLAY_STATE]: QuickAddOverlayStateDetail | undefined;
  [APP_EVENT.CANVAS_ZOOM_IN]: undefined;
  [APP_EVENT.CANVAS_ZOOM_OUT]: undefined;
  [APP_EVENT.CANVAS_FIT_VIEW]: undefined;
  [APP_EVENT.CANVAS_FIT_BOUNDS]: CanvasFitBoundsDetail;
  [APP_EVENT.CANVAS_AUTO_LAYOUT]: undefined;
  [APP_EVENT.CANVAS_MODE_CHANGED]: CanvasModeChangedDetail;
  [APP_EVENT.CANVAS_ADD_COMPONENT]: CanvasAddComponentDetail;
  [APP_EVENT.CANVAS_FIRST_COMPONENT_ADDED]: FirstComponentAddedDetail;
  [APP_EVENT.SHOW_PATTERN_LIBRARY]: undefined;
  [APP_EVENT.KEYBOARD_SHORTCUTS_OPEN]: { section?: string } | undefined;
  [APP_EVENT.WORKFLOW_RECOMMENDATION_SELECTED]: WorkflowRecommendationDetail;
};

type ValidatorMap = {
  [K in AppEventName]?: (detail: unknown) => detail is AppEventPayloads[K];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && !Number.isNaN(value);

const validators: ValidatorMap = {
  [APP_EVENT.SHORTCUT_QUICK_ADD]: (detail): detail is AppEventPayloads[typeof APP_EVENT.SHORTCUT_QUICK_ADD] => {
    if (detail === undefined) return true;
    if (!isObject(detail)) return false;
    if (
      "position" in detail &&
      detail.position !== undefined &&
      !(
        isObject(detail.position) &&
        isNumber((detail.position as { x?: unknown }).x) &&
        isNumber((detail.position as { y?: unknown }).y)
      )
    ) {
      return false;
    }
    return true;
  },
  [APP_EVENT.QUICK_ADD_OVERLAY_OPEN]: (detail): detail is AppEventPayloads[typeof APP_EVENT.QUICK_ADD_OVERLAY_OPEN] =>
    validators[APP_EVENT.SHORTCUT_QUICK_ADD]?.(detail) ?? true,
  [APP_EVENT.QUICK_ADD_OVERLAY_OPENED]: (detail): detail is AppEventPayloads[typeof APP_EVENT.QUICK_ADD_OVERLAY_OPENED] =>
    validators[APP_EVENT.SHORTCUT_QUICK_ADD]?.(detail) ?? true,
  [APP_EVENT.QUICK_ADD_OVERLAY_CLOSE]: (detail): detail is AppEventPayloads[typeof APP_EVENT.QUICK_ADD_OVERLAY_CLOSE] =>
    validators[APP_EVENT.SHORTCUT_QUICK_ADD]?.(detail) ?? true,
  [APP_EVENT.QUICK_ADD_OVERLAY_CLOSED]: (detail): detail is AppEventPayloads[typeof APP_EVENT.QUICK_ADD_OVERLAY_CLOSED] =>
    validators[APP_EVENT.SHORTCUT_QUICK_ADD]?.(detail) ?? true,
  [APP_EVENT.QUICK_ADD_OVERLAY_STATE]: (
    detail,
  ): detail is AppEventPayloads[typeof APP_EVENT.QUICK_ADD_OVERLAY_STATE] => {
    if (detail === undefined) return true;
    return isObject(detail) ? true : false;
  },
  [APP_EVENT.CANVAS_FIT_BOUNDS]: (
    detail,
  ): detail is AppEventPayloads[typeof APP_EVENT.CANVAS_FIT_BOUNDS] => {
    if (!isObject(detail)) return false;
    if (
      !isNumber((detail as { x?: unknown }).x) ||
      !isNumber((detail as { y?: unknown }).y) ||
      !isNumber((detail as { width?: unknown }).width) ||
      !isNumber((detail as { height?: unknown }).height)
    ) {
      return false;
    }
    if (
      (detail as { padding?: unknown }).padding !== undefined &&
      !isNumber((detail as { padding?: unknown }).padding)
    ) {
      return false;
    }
    return true;
  },
  [APP_EVENT.CANVAS_MODE_CHANGED]: (
    detail,
  ): detail is AppEventPayloads[typeof APP_EVENT.CANVAS_MODE_CHANGED] => {
    return isObject(detail) && typeof detail.mode === "string";
  },
  [APP_EVENT.CANVAS_ADD_COMPONENT]: (
    detail,
  ): detail is AppEventPayloads[typeof APP_EVENT.CANVAS_ADD_COMPONENT] => {
    if (!isObject(detail) || typeof (detail as { componentType?: unknown }).componentType !== "string") {
      return false;
    }
    if ((detail as { position?: unknown }).position !== undefined) {
      const position = (detail as { position?: unknown }).position;
      if (
        !isObject(position) ||
        !isNumber((position as { x?: unknown }).x) ||
        !isNumber((position as { y?: unknown }).y)
      ) {
        return false;
      }
    }
    return true;
  },
  [APP_EVENT.CANVAS_FIRST_COMPONENT_ADDED]: (
    detail,
  ): detail is AppEventPayloads[typeof APP_EVENT.CANVAS_FIRST_COMPONENT_ADDED] => {
    if (!isObject(detail)) return false;
    const componentId = (detail as { componentId?: unknown }).componentId;
    return componentId === null || typeof componentId === "string";
  },
  [APP_EVENT.SHOW_PATTERN_LIBRARY]: (
    detail,
  ): detail is AppEventPayloads[typeof APP_EVENT.SHOW_PATTERN_LIBRARY] => {
    return detail === undefined;
  },
  [APP_EVENT.KEYBOARD_SHORTCUTS_OPEN]: (
    detail,
  ): detail is AppEventPayloads[typeof APP_EVENT.KEYBOARD_SHORTCUTS_OPEN] => {
    if (detail === undefined) return true;
    return isObject(detail) && ("section" in detail ? typeof detail.section === "string" : true);
  },
};

export function validateAppEvent<T extends AppEventName>(
  topic: T,
  detail: unknown,
): detail is AppEventPayloads[T] {
  const validator = validators[topic];
  if (!validator) {
    return true;
  }

  const result = validator(detail);
  if (!result && isDev) {
    console.warn(
      `[appEvents] Invalid payload for "${topic}":`,
      detail,
    );
  }
  return result;
}

export function createAppCustomEvent<T extends AppEventName>(
  topic: T,
  detail: AppEventPayloads[T],
): CustomEvent<AppEventPayloads[T]> {
  if (isDev) {
    validateAppEvent(topic, detail);
  }
  return new CustomEvent(topic, { detail });
}

export function dispatchAppEvent<T extends AppEventName>(
  topic: T,
  detail: AppEventPayloads[T],
  target?: Window | Document | HTMLElement,
): void {
  const eventTarget =
    target ??
    (typeof window !== "undefined"
      ? window
      : undefined);
  if (!eventTarget) {
    if (isDev) {
      console.warn(
        `[appEvents] Attempted to dispatch "${topic}" without an available event target (likely SSR).`,
      );
    }
    return;
  }

  eventTarget.dispatchEvent(createAppCustomEvent(topic, detail));
}
