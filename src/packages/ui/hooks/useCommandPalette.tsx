import { componentIconMap } from "@/lib/design/component-icons";
import {
  formatShortcutKey,
  getAllShortcuts,
  getShortcutsVersion,
} from "@/lib/shortcuts/KeyboardShortcuts";
import { componentTypes } from "@/packages/ui/components/panels/ComponentPalette";
import {
  Boxes,
  Copy,
  Eye,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Keyboard,
  LayoutDashboard,
  Lightbulb,
  Maximize2,
  Mic,
  Palette,
  Redo2,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  Star,
  Target,
  Undo2,
  Upload,
  Zap,
  ZoomOut,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type CommandSection =
  | "navigation"
  | "components"
  | "actions"
  | "workspace"
  | "learning"
  | "help";

const sectionLabels: Record<CommandSection, string> = {
  navigation: "Navigate",
  components: "Add Component",
  actions: "Actions",
  workspace: "Workspace",
  learning: "Learning",
  help: "Help",
};

const sectionOrder: CommandSection[] = [
  "navigation",
  "components",
  "actions",
  "workspace",
  "learning",
  "help",
];

type PaletteComponent = (typeof componentTypes)[number];

const COMPONENT_COMMAND_LIMIT = 24;

const POPULAR_COMPONENT_TYPE_ORDER: string[] = [
  "load-balancer",
  "api-gateway",
  "server",
  "microservice",
  "rest-api",
  "database",
  "postgresql",
  "mysql",
  "mongodb",
  "cache",
  "redis",
  "message-queue",
  "producer",
  "consumer",
  "cdn",
  "web-app",
  "mobile-app",
  "client",
  "serverless",
  "lambda",
  "kubernetes",
  "container",
  "docker",
  "monitoring",
  "logging",
  "metrics",
  "alerting",
  "authentication",
  "authorization",
  "websocket",
];

const COMPONENT_ALIAS_KEYWORDS: Partial<
  Record<PaletteComponent["type"], string[]>
> = {
  "load-balancer": ["lb", "balancer", "traffic", "distribution"],
  "api-gateway": ["gateway", "edge", "api"],
  server: ["compute", "instance", "vm", "host"],
  microservice: ["service", "compute", "ms"],
  "rest-api": ["http", "endpoint", "api"],
  database: ["db", "data store", "sql"],
  postgresql: ["postgres", "sql", "relational"],
  mysql: ["sql", "relational", "rdbms"],
  mongodb: ["document", "nosql", "mongo"],
  cache: ["caching", "performance", "memcached"],
  redis: ["cache", "in-memory", "redis"],
  "message-queue": ["queue", "mq", "kafka", "rabbitmq", "async"],
  producer: ["publisher", "pub", "mq"],
  consumer: ["subscriber", "sub", "mq"],
  cdn: ["content", "delivery", "edge"],
  "web-app": ["frontend", "browser", "client"],
  "mobile-app": ["mobile", "ios", "android"],
  client: ["frontend", "user", "consumer"],
  serverless: ["functions", "faas"],
  lambda: ["aws", "function", "serverless"],
  kubernetes: ["k8s", "orchestration", "containers"],
  container: ["docker", "runtime", "containers"],
  docker: ["container", "runtime"],
  monitoring: ["observability", "metrics", "alerts"],
  logging: ["logs", "observability"],
  metrics: ["observability", "analytics"],
  alerting: ["notifications", "observability"],
  authentication: ["auth", "login", "identity", "oauth"],
  authorization: ["authz", "permissions", "access control"],
  websocket: ["realtime", "ws", "web socket"],
};

interface CommandData {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: () => void;
  section: CommandSection;
  shortcut?: string;
  available?: boolean;
  keywords?: string[];
}

interface UseCommandPaletteProps {
  selectedChallenge: any;
  onNavigate: (screen: string) => void;
  onClose?: () => void;
  currentScreen?: string;
}

export function useCommandPalette({
  selectedChallenge,
  onNavigate,
  onClose,
  currentScreen = "design-canvas",
}: UseCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shortcutsVersion, setShortcutsVersion] = useState(
    getShortcutsVersion(),
  );

  // Update shortcuts version periodically
  useEffect(() => {
    const id = setInterval(
      () => setShortcutsVersion(getShortcutsVersion()),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  const commands: CommandData[] = useMemo(() => {
    const allShortcuts = getAllShortcuts();
    const getShortcutDisplay = (description: string) => {
      const shortcut = allShortcuts.find((s) =>
        s.description.toLowerCase().includes(description.toLowerCase()),
      );
      return shortcut
        ? formatShortcutKey(shortcut.key, shortcut.modifiers)
        : undefined;
    };

    const isDesignCanvas = currentScreen === "design-canvas";
    const canAddComponent = isDesignCanvas && !!selectedChallenge;

    const componentTypeById = new Map(
      componentTypes.map((component) => [component.type, component] as const),
    );
    const prioritizedComponents = POPULAR_COMPONENT_TYPE_ORDER.map((type) =>
      componentTypeById.get(type),
    ).filter(Boolean) as PaletteComponent[];

    const prioritizedTypeSet = new Set(
      prioritizedComponents.map((component) => component.type),
    );
    const fallbackComponents = componentTypes.filter(
      (component) => !prioritizedTypeSet.has(component.type),
    );

    const componentCatalog = [
      ...prioritizedComponents,
      ...fallbackComponents,
    ].slice(0, COMPONENT_COMMAND_LIMIT);

    const componentCommands: CommandData[] = componentCatalog.map(
      (component) => {
        const iconEntry = componentIconMap[component.type];
        const IconComponent = iconEntry?.icon ?? component.icon ?? Boxes;

        const keywords = new Set<string>();
        const aliasKeywords = COMPONENT_ALIAS_KEYWORDS[component.type];

        const addKeyword = (value?: string) => {
          if (value) {
            keywords.add(value);
          }
        };

        const addTokens = (value?: string) => {
          if (!value) {
            return;
          }
          value
            .split(/[\s/-]+/)
            .map((token) => token.trim())
            .filter(Boolean)
            .forEach((token) => keywords.add(token));
        };

        addKeyword(component.category);
        addKeyword(component.type);
        addKeyword(component.label);
        addKeyword(component.description);
        addTokens(component.label);
        addTokens(component.type);
        addTokens(component.description);

        aliasKeywords?.forEach((alias) => addKeyword(alias));

        return {
          id: `add-component-${component.type}`,
          title: `Add ${component.label}`,
          description: component.description,
          icon: IconComponent,
          action: () => {
            if (!canAddComponent) {
              return;
            }
            window.dispatchEvent(
              new CustomEvent("canvas:add-component", {
                detail: { componentType: component.type },
              }),
            );
            onClose?.();
          },
          section: "components",
          available: canAddComponent,
          keywords: Array.from(keywords),
        };
      },
    );

    const commands: CommandData[] = [
      // Navigation Commands
      {
        id: "nav-pro-version",
        title: "Upgrade to Pro",
        description:
          "Access premium features, advanced AI, and exclusive content",
        icon: Star,
        action: () => onNavigate("pro-version"),
        section: "navigation",
        shortcut: undefined,
        available: true,
        keywords: ["billing", "pricing", "subscription", "membership"],
      },
      {
        id: "nav-challenges",
        title: "Select Challenge",
        description: "Choose a system design challenge to practice",
        icon: Target,
        action: () => onNavigate("challenge-selection"),
        section: "navigation",
        shortcut: getShortcutDisplay("challenge selection"),
        available: true,
        keywords: ["start", "new project", "practice", "reset"],
      },
      {
        id: "nav-design",
        title: "Design Canvas",
        description: "Create your system architecture",
        icon: Palette,
        action: () => onNavigate("design-canvas"),
        section: "navigation",
        shortcut: getShortcutDisplay("design canvas"),
        available: !!selectedChallenge,
        keywords: ["canvas", "workspace", "diagram", "architecture"],
      },
      {
        id: "nav-recording",
        title: "Record Explanation",
        description: "Practice your technical communication",
        icon: Mic,
        action: () => onNavigate("audio-recording"),
        section: "navigation",
        shortcut: getShortcutDisplay("audio recording"),
        available: !!selectedChallenge,
        keywords: ["audio", "practice", "presentation", "storytelling"],
      },
      {
        id: "nav-review",
        title: "Session Review",
        description: "Analyze your performance and get feedback",
        icon: Eye,
        action: () => onNavigate("review"),
        section: "navigation",
        shortcut: getShortcutDisplay("review"),
        available: !!selectedChallenge,
        keywords: ["feedback", "analysis", "summary"],
      },
      {
        id: "nav-config",
        title: "Configuration",
        description: "Adjust canvas and app settings",
        icon: Settings,
        action: () => onNavigate("config"),
        section: "workspace",
        shortcut: undefined,
        available: true,
        keywords: ["settings", "preferences", "theme", "options"],
      },

      // Component Addition Commands
      ...componentCommands,

      // Action Commands
      {
        id: "action-new-session",
        title: "New Session",
        description: "Start a fresh practice session",
        icon: RotateCcw,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:new-project"));
          onNavigate("challenge-selection");
        },
        section: "actions",
        shortcut: getShortcutDisplay("new project"),
        available: true,
        keywords: ["reset", "restart", "fresh", "begin"],
      },
      {
        id: "action-open-project",
        title: "Open Session",
        description: "Load an existing architecture session",
        icon: FolderOpen,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:open-project"));
        },
        section: "actions",
        shortcut: getShortcutDisplay("open project"),
        available: true,
        keywords: ["load", "resume", "project", "file"],
      },
      {
        id: "action-save",
        title: "Save Session",
        description: "Save your current progress",
        icon: Save,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:save-project"));
        },
        section: "actions",
        shortcut: getShortcutDisplay("save project"),
        available: !!selectedChallenge,
        keywords: ["persist", "backup", "store"],
      },
      {
        id: "action-import",
        title: "Import Design",
        description: "Bring in a saved architecture from a file",
        icon: Upload,
        action: () => {
          window.dispatchEvent(new CustomEvent("import:trigger"));
        },
        section: "actions",
        shortcut: undefined,
        available: true,
        keywords: ["load", "upload", "json", "restore"],
      },
      {
        id: "action-undo",
        title: "Undo Last Change",
        description: "Step back to the previous design state",
        icon: Undo2,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:undo"));
        },
        section: "actions",
        shortcut: getShortcutDisplay("undo"),
        available: true,
        keywords: ["revert", "back", "history"],
      },
      {
        id: "action-redo",
        title: "Redo Change",
        description: "Reapply the change you just undid",
        icon: Redo2,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:redo"));
        },
        section: "actions",
        shortcut: getShortcutDisplay("redo"),
        available: true,
        keywords: ["forward", "history", "repeat"],
      },
      {
        id: "action-duplicate",
        title: "Duplicate Selection",
        description: "Copy the selected components in place",
        icon: Copy,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:duplicate"));
        },
        section: "actions",
        shortcut: getShortcutDisplay("duplicate selected"),
        available: true,
        keywords: ["copy", "clone", "repeat"],
      },

      // Workspace Commands
      {
        id: "workspace-ai-settings",
        title: "AI Settings",
        description: "Configure AI provider settings and API keys",
        icon: Settings,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:ai-settings"));
        },
        section: "workspace",
        shortcut: getShortcutDisplay("AI Settings"),
        available: true,
        keywords: ["api", "providers", "integration"],
      },
      {
        id: "workspace-view-canvas",
        title: "Focus Canvas",
        description: "Jump to the main architecture canvas view",
        icon: LayoutDashboard,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:view-canvas"));
        },
        section: "workspace",
        shortcut: getShortcutDisplay("switch to canvas view"),
        available: true,
        keywords: ["workspace", "board", "design"],
      },
      {
        id: "workspace-view-components",
        title: "Open Component Library",
        description: "Switch to the component palette panel",
        icon: Boxes,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:view-components"));
        },
        section: "workspace",
        shortcut: getShortcutDisplay("switch to component palette"),
        available: true,
        keywords: ["library", "palette", "catalog"],
      },
      {
        id: "workspace-zoom-reset",
        title: "Reset Zoom",
        description: "Fit the entire design back into view",
        icon: ZoomOut,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:zoom-reset"));
        },
        section: "workspace",
        shortcut: getShortcutDisplay("reset zoom"),
        available: true,
        keywords: ["fit", "view", "center"],
      },
      {
        id: "workspace-fullscreen",
        title: "Toggle Fullscreen",
        description: "Enter distraction-free focus mode",
        icon: Maximize2,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcut:toggle-fullscreen"));
        },
        section: "workspace",
        shortcut: getShortcutDisplay("toggle fullscreen"),
        available: true,
        keywords: ["focus", "distraction free", "expand"],
      },

      // Help & Learning Commands
      {
        id: "learning-guided-tour",
        title: "Start Guided Tour",
        description: "Walk through the interface with step-by-step highlights",
        icon: Sparkles,
        action: () => {
          window.dispatchEvent(
            new CustomEvent("onboarding:start", {
              detail: { flowId: "guided-tour" },
            }),
          );
          onClose?.();
        },
        section: "learning",
        shortcut: undefined,
        available: true,
        keywords: ["onboarding", "walkthrough", "tour", "help", "tutorial"],
      },
      {
        id: "learning-simplified-tour",
        title: "Just the Basics Tour",
        description: "Quick 3-step introduction to essential features",
        icon: Zap,
        action: () => {
          window.dispatchEvent(
            new CustomEvent("onboarding:start", {
              detail: { flowId: "simplified-tour" },
            }),
          );
          onClose?.();
        },
        section: "learning",
        shortcut: undefined,
        available: true,
        keywords: ["onboarding", "quick", "basics", "tutorial", "intro"],
      },
      {
        id: "learning-canvas-tour",
        title: "Start Canvas Tour",
        description: "Learn how to use the design canvas",
        icon: LayoutDashboard,
        action: () => {
          window.dispatchEvent(
            new CustomEvent("onboarding:start", {
              detail: { flowId: "canvas-tour" },
            }),
          );
          onClose?.();
        },
        section: "learning",
        shortcut: undefined,
        available: true,
        keywords: ["canvas", "tutorial", "help", "design"],
      },
      {
        id: "learning-progressive-tip",
        title: "Show Next Tip",
        description: "Surface the next contextual onboarding insight",
        icon: Lightbulb,
        action: () => {
          window.dispatchEvent(new CustomEvent("onboarding:show-next-tip"));
          onClose?.();
        },
        section: "learning",
        shortcut: undefined,
        available: true,
        keywords: ["hint", "coaching", "guidance", "help"],
      },
      {
        id: "learning-reset-onboarding",
        title: "Reset All Tutorials",
        description:
          "Clear completed tutorials and see the welcome screen again",
        icon: RotateCcw,
        action: () => {
          // Clear all onboarding state
          const settings = {
            ...(window.localStorage.getItem("archicomm_settings")
              ? JSON.parse(window.localStorage.getItem("archicomm_settings")!)
              : {}),
            onboarding: {
              showWelcomeOnStartup: true,
              completedFlows: [],
              skillLevel: "intermediate",
              preferredLearningStyle: "contextual",
              enableProgressiveTips: false,
            },
          };
          window.localStorage.setItem(
            "archicomm_settings",
            JSON.stringify(settings),
          );
          window.location.reload();
        },
        section: "help",
        shortcut: undefined,
        available: true,
        keywords: ["reset", "restart", "clear", "onboarding", "tutorial"],
      },
      {
        id: "learning-shortcut-cheatsheet",
        title: "Open Shortcut Cheat Sheet",
        description: "Toggle the inline keyboard shortcut reference",
        icon: Keyboard,
        action: () => {
          window.dispatchEvent(
            new CustomEvent("shortcuts:toggle-inline-cheatsheet"),
          );
        },
        section: "learning",
        shortcut: getShortcutDisplay("show shortcuts help"),
        available: true,
        keywords: ["keyboard", "reference", "productivity"],
      },
      {
        id: "learning-shortcut-practice",
        title: "Enter Shortcut Learn Mode",
        description: "Practice shortcuts interactively with spaced repetition",
        icon: GraduationCap,
        action: () => {
          window.dispatchEvent(new CustomEvent("shortcuts:enter-learn-mode"));
        },
        section: "learning",
        shortcut: undefined,
        available: true,
        keywords: ["practice", "training", "coach"],
      },
      {
        id: "help-guide",
        title: "User Guide",
        description: "Learn how to use ArchiComm effectively",
        icon: HelpCircle,
        action: () => {
          // Add user guide logic
          console.log("Opening user guide...");
        },
        section: "help",
        available: true,
        keywords: ["documentation", "manual", "support"],
      },
    ];

    return commands;
  }, [selectedChallenge, onNavigate, shortcutsVersion, onClose, currentScreen]);

  const filteredCommands = useMemo(() => {
    const available = commands.filter((cmd) => cmd.available !== false);
    const q = query.trim().toLowerCase();
    if (!q) return available;

    const tokens = q.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      return available;
    }

    const computeFieldScore = (rawField: string | undefined, token: string) => {
      if (!rawField) return Number.POSITIVE_INFINITY;
      const field = rawField.toLowerCase();
      if (!field) return Number.POSITIVE_INFINITY;

      if (field === token) {
        return -5; // strong boost for exact matches
      }

      const directIndex = field.indexOf(token);
      if (directIndex >= 0) {
        return directIndex;
      }

      const words = field.split(/\s+/);
      const initials = words.map((word) => word[0]).join("");
      if (token.length <= initials.length && initials.startsWith(token)) {
        return words.length; // mild boost for acronym/initial matches
      }

      let searchIndex = 0;
      let penalty = 0;
      for (let i = 0; i < token.length; i += 1) {
        const char = token[i];
        const foundIndex = field.indexOf(char, searchIndex);
        if (foundIndex === -1) {
          return Number.POSITIVE_INFINITY;
        }
        penalty += foundIndex - searchIndex;
        searchIndex = foundIndex + 1;
      }

      penalty += field.length - searchIndex;
      return penalty + token.length;
    };

    const sectionWeights: Record<CommandSection, number> = {
      navigation: -1,
      components: -0.5,
      actions: 0,
      workspace: 0.5,
      learning: 1,
      help: 1.5,
    };

    const scored = available
      .map((cmd) => {
        const fields = [
          cmd.title,
          cmd.description,
          cmd.shortcut,
          cmd.keywords ? cmd.keywords.join(" ") : undefined,
          sectionLabels[cmd.section] ?? cmd.section,
        ];

        let totalScore = 0;

        for (const token of tokens) {
          let bestForToken = Number.POSITIVE_INFINITY;
          for (const field of fields) {
            const fieldScore = computeFieldScore(field, token);
            if (fieldScore < bestForToken) {
              bestForToken = fieldScore;
            }
            if (bestForToken <= -5) {
              break;
            }
          }

          if (!Number.isFinite(bestForToken)) {
            totalScore = Number.POSITIVE_INFINITY;
            break;
          }

          totalScore += bestForToken;
        }

        if (!Number.isFinite(totalScore)) {
          return { cmd, score: Number.POSITIVE_INFINITY };
        }

        const normalizedScore = totalScore + (sectionWeights[cmd.section] ?? 0);
        const shortcutBonus = cmd.shortcut ? -0.25 : 0;

        return { cmd, score: normalizedScore + shortcutBonus };
      })
      .filter((entry) => Number.isFinite(entry.score))
      .sort((a, b) => a.score - b.score)
      .map((entry) => entry.cmd);

    if (scored.length > 0) {
      return scored;
    }

    // Fallback to basic filtering if fuzzy yields nothing
    return available.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        (c.keywords
          ? c.keywords.some((keyword) => keyword.toLowerCase().includes(q))
          : false),
    );
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups = sectionOrder.reduce(
      (acc, section) => {
        acc[section] = [];
        return acc;
      },
      {} as Record<CommandSection, CommandData[]>,
    );

    filteredCommands.forEach((cmd) => {
      groups[cmd.section].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  return {
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    filteredCommands,
    groupedCommands,
    sectionOrder,
  };
}
