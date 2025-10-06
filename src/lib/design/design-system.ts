// Centralized design tokens, variants, and utilities
// Provides a single source of truth for visual styling

export type SizeVariant = "sm" | "md" | "lg";
export type StyleVariant = "solid" | "glass" | "minimal";
export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const spacing = {
  xs: "var(--space-xs)",
  sm: "var(--space-sm)",
  md: "var(--space-md)",
  lg: "var(--space-lg)",
  xl: "var(--space-xl)",
  "2xl": "var(--space-2xl)",
  "3xl": "var(--space-3xl)",
} as const;

export const radii = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
} as const;

export const typography = {
  xs: "text-[11px] leading-4",
  sm: "text-[12px] leading-5",
  md: "text-[14px] leading-6",
  lg: "text-[16px] leading-7",
  xl: "text-[18px] leading-7",
  display: "text-[22px] leading-8 font-semibold tracking-tight",
  subtleShadow:
    "shadow-[0_1px_0_rgba(0,0,0,0.06)] [text-shadow:var(--text-shadow-subtle)]",
} as const;

export const transitions = {
  fast: "var(--transition-fast)",
  medium: "var(--transition-medium)",
  slow: "var(--transition-slow)",
} as const;

export const elevation = {
  0: "shadow-none",
  1: "shadow-[var(--elevation-1)]",
  2: "shadow-[var(--elevation-2)]",
  3: "shadow-[var(--elevation-3)]",
  4: "shadow-[var(--elevation-4)]",
  5: "shadow-[var(--elevation-5)]",
  6: "shadow-[var(--elevation-6)]",
} as const satisfies Record<ElevationLevel, string>;

export const glass = {
  surface:
    "backdrop-blur-[var(--glass-blur)] bg-[var(--glass-bg)] border border-[var(--glass-border)]",
  interactive:
    "transition-all duration-200 hover:bg-[color-mix(in_oklab,var(--glass-bg)_85%,#fff)]",
} as const;

export const componentBg =
  "bg-[var(--component-bg)] border-[var(--component-border)] shadow-[var(--component-shadow)]";

export const sizeVariants: Record<SizeVariant, string> = {
  sm: "px-2 py-1 text-xs h-7",
  md: "px-3 py-2 text-sm h-9",
  lg: "px-4 py-3 text-base h-12",
};

export const styleVariants: Record<StyleVariant, string> = {
  solid: "bg-card border border-border",
  glass: `${glass.surface}`,
  minimal: "bg-transparent border border-border/50",
};

export const animations = {
  hoverRaise:
    "transition-transform duration-200 ease-out hover:-translate-y-0.5",
  pulseGlow:
    "transition-shadow duration-200 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  tap: "active:scale-[0.98]",
} as const;

export const overlayZIndex = {
  groups: 50,
  guides: 60,
  toolbar: 80,
  selection: 100,
  contextMenu: 120,
} as const;

// Semantic roles used across component types
export const colorRoles = {
  primary: "from-blue-500 to-blue-600",
  secondary: "from-violet-500 to-violet-600",
  success: "from-emerald-500 to-emerald-600",
  warning: "from-amber-500 to-amber-600",
  danger: "from-rose-500 to-rose-600",
  neutral: "from-slate-500 to-slate-600",
} as const;

export const componentTypeToRole: Record<string, keyof typeof colorRoles> = {
  server: "primary",
  microservice: "secondary",
  serverless: "secondary",
  lambda: "warning",
  "cloud-function": "primary",
  container: "secondary",
  docker: "secondary",
  kubernetes: "secondary",
  database: "success",
  postgresql: "primary",
  mysql: "warning",
  mongodb: "success",
  redis: "danger",
  cache: "warning",
  storage: "neutral",
  s3: "warning",
  "blob-storage": "primary",
  "file-system": "warning",
  "load-balancer": "secondary",
  "api-gateway": "danger",
  cdn: "secondary",
  firewall: "danger",
  "message-queue": "warning",
  websocket: "success",
  grpc: "primary",
  "rest-api": "success",
  graphql: "secondary",
  webhook: "secondary",
  client: "neutral",
  "web-app": "primary",
  "mobile-app": "success",
  "desktop-app": "secondary",
  "iot-device": "success",
  security: "danger",
  authentication: "warning",
  authorization: "warning",
  oauth: "secondary",
  jwt: "success",
  monitoring: "primary",
  logging: "neutral",
  metrics: "success",
  alerting: "danger",
  elasticsearch: "warning",
  kibana: "primary",
  "data-warehouse": "secondary",
  "data-lake": "primary",
  etl: "secondary",
  "stream-processing": "warning",
  "event-sourcing": "success",
  cqrs: "secondary",
  "edge-computing": "neutral",
  blockchain: "warning",
  "ai-ml": "secondary",
};

// Drawing-specific design tokens
export const drawingColors = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Purple", value: "#a855f7" },
  { name: "Orange", value: "#f97316" },
  { name: "White", value: "#ffffff" },
] as const;

export const strokeSizePresets = {
  thin: 2,
  medium: 4,
  thick: 8,
  "extra-thick": 12,
} as const;

export const drawingToolButton =
  "flex items-center justify-center w-9 h-9 rounded-md border-2 transition-all duration-200";
export const drawingToolButtonActive =
  "bg-blue-500 border-blue-600 text-white shadow-md";
export const drawingToolButtonHover = "hover:bg-gray-50 hover:border-gray-400";
export const drawingToolIcon = "w-5 h-5";

export const drawingOverlay =
  "absolute inset-0 w-full h-full pointer-events-auto";
export const drawingStroke = "transition-opacity duration-200";
export const drawingStrokeHovered = "opacity-50";
export const drawingCursor = "cursor-crosshair";

export const colorPickerSwatch =
  "w-8 h-8 rounded border-2 transition-all duration-200";
export const colorPickerSwatchActive = "border-blue-500 shadow-md scale-110";
export const colorPickerGrid = "grid grid-cols-4 gap-2";

// Toolbar-specific design tokens
export const toolbarSectionBg = {
  modes: "bg-blue-50/30",
  view: "bg-gray-50/30",
  animation: "bg-purple-50/30",
  layout: "bg-green-50/30",
  validation: "bg-amber-50/30",
  export: "bg-indigo-50/30",
  settings: "bg-gray-50/30",
} as const;

export const primaryAction = {
  base: "w-11 h-11 shadow-lg",
  gradient: "bg-gradient-to-br from-blue-500 to-blue-600",
  hover: "hover:shadow-xl hover:scale-105",
  active: "active:scale-100",
} as const;

export const sectionDivider =
  "w-0.5 h-8 mx-3 bg-gradient-to-b from-transparent via-gray-300 to-transparent" as const;

// Helpers
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getElevation(level: ElevationLevel = 1) {
  return elevation[level];
}

export function getSize(size: SizeVariant = "md") {
  return sizeVariants[size];
}

export function getStyle(variant: StyleVariant = "solid") {
  return styleVariants[variant];
}

export function getGradientForRole(role: keyof typeof colorRoles) {
  return `bg-gradient-to-br ${colorRoles[role]}`;
}

export function getComponentGradient(type: string) {
  const role = componentTypeToRole[type] ?? "neutral";
  return getGradientForRole(role);
}

export const designSystem = {
  spacing,
  radii,
  typography,
  transitions,
  elevation,
  glass,
  componentBg,
  sizeVariants,
  styleVariants,
  animations,
  colorRoles,
  componentTypeToRole,
  toolbarSectionBg,
  primaryAction,
  sectionDivider,
  drawingColors,
  strokeSizePresets,
  drawingToolButton,
  drawingToolButtonActive,
  drawingToolButtonHover,
  drawingToolIcon,
  drawingOverlay,
  drawingStroke,
  drawingStrokeHovered,
  drawingCursor,
  colorPickerSwatch,
  colorPickerSwatchActive,
  colorPickerGrid,
  cx,
  getElevation,
  getSize,
  getStyle,
  getGradientForRole,
  getComponentGradient,
};

export default designSystem;
