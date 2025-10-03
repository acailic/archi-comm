/**
 * src/features/canvas/components/ConnectionEditorPopover.tsx
 * Popover component for editing connection properties
 * Handles connection label editing and type selection
 * RELEVANT FILES: CanvasArea.tsx, useConnectionEditor.ts
 */

import type { ConnectionTemplate } from "@/packages/canvas/config/connection-templates";
import {
  addToRecentlyUsed,
  applyTemplate,
  connectionTemplates,
  getPopularTemplates,
  getTemplateById,
} from "@/packages/canvas/config/connection-templates";
import type { Connection, VisualStyle } from "@/shared/contracts";
import { cn } from "@core/utils";
import * as Popover from "@radix-ui/react-popover";
import { Button } from "@ui/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ui/components/ui/command";
import { Input } from "@ui/components/ui/input";
import { Label } from "@ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/ui/select";
import * as LucideIcons from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  LinkIcon,
  Loader2,
  RefreshCw,
  Trash2Icon,
  Zap,
} from "lucide-react";
import React from "react";

interface ConnectionEditorPopoverProps {
  selectedConnection: Connection;
  x: number;
  y: number;
  onLabelChange: (id: string, label: string) => void;
  onTypeChange: (id: string, type: Connection["type"]) => void;
  onVisualStyleChange: (id: string, visualStyle: VisualStyle) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TEMPLATE_CATEGORY_LABELS: Record<ConnectionTemplate["category"], string> =
  {
    "data-flow": "Data Flow & APIs",
    "control-flow": "Control & Resilience",
    sync: "Sync & Async Patterns",
  };

const DEFAULT_TEMPLATE_ICON = LucideIcons.Zap;

const getTemplateIcon = (iconName: string) => {
  const icons = LucideIcons as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  return icons[iconName] ?? DEFAULT_TEMPLATE_ICON;
};

export function ConnectionEditorPopover({
  selectedConnection,
  x,
  y,
  onLabelChange,
  onTypeChange,
  onVisualStyleChange,
  onDelete,
  onClose,
}: ConnectionEditorPopoverProps) {
  const initialConnectionRef = React.useRef<Connection>(selectedConnection);

  React.useEffect(() => {
    initialConnectionRef.current = selectedConnection;
  }, [selectedConnection.id]);

  const currentTemplateId = React.useMemo(() => {
    const metadata = selectedConnection.metadata as
      | Record<string, unknown>
      | undefined;
    const templateId = metadata?.templateId;
    return typeof templateId === "string" ? templateId : undefined;
  }, [selectedConnection.metadata]);

  const quickTemplates = React.useMemo(() => getPopularTemplates(6), []);
  const [templatePopoverOpen, setTemplatePopoverOpen] = React.useState(false);
  const [templateSearch, setTemplateSearch] = React.useState("");
  const [templateFeedback, setTemplateFeedback] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    if (!templateFeedback) return;
    const timer = window.setTimeout(() => setTemplateFeedback(null), 900);
    return () => window.clearTimeout(timer);
  }, [templateFeedback]);

  React.useEffect(() => {
    if (!templatePopoverOpen) {
      setTemplateSearch("");
    }
  }, [templatePopoverOpen]);

  const groupedTemplates = React.useMemo(() => {
    const normalizedSearch = templateSearch.trim().toLowerCase();
    const groups = new Map<
      ConnectionTemplate["category"],
      ConnectionTemplate[]
    >();

    connectionTemplates.forEach((template) => {
      if (normalizedSearch) {
        const haystack =
          `${template.name} ${template.description} ${template.defaultLabel} ${template.metadata ? Object.values(template.metadata).join(" ") : ""}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return;
        }
      }

      if (!groups.has(template.category)) {
        groups.set(template.category, []);
      }
      groups.get(template.category)!.push(template);
    });

    return Array.from(groups.entries())
      .map(([category, templates]) => ({
        category,
        templates: templates.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [templateSearch]);

  const connectionTypes: Array<{
    value: Connection["type"];
    label: string;
    icon: React.ReactNode;
  }> = React.useMemo(
    () => [
      {
        value: "data",
        label: "Data Flow",
        icon: <ArrowRight className="h-4 w-4" />,
      },
      {
        value: "control",
        label: "Control Flow",
        icon: <Zap className="h-4 w-4" />,
      },
      {
        value: "sync",
        label: "Synchronous",
        icon: <LinkIcon className="h-4 w-4" />,
      },
      {
        value: "async",
        label: "Asynchronous",
        icon: <Loader2 className="h-4 w-4" />,
      },
    ],
    [],
  );

  const visualStyles: Array<{
    value: VisualStyle;
    label: string;
    icon: React.ReactNode;
  }> = React.useMemo(
    () => [
      {
        value: "default",
        label: "Default",
        icon: <ArrowRight className="h-4 w-4" />,
      },
      {
        value: "ack",
        label: "ACK",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      },
      {
        value: "retry",
        label: "Retry",
        icon: <RefreshCw className="h-4 w-4 text-orange-500" />,
      },
      {
        value: "error",
        label: "Error",
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      },
    ],
    [],
  );

  const handleApplyTemplate = React.useCallback(
    (templateId: string) => {
      const template = getTemplateById(templateId);
      if (!template) return;

      applyTemplate(template, selectedConnection);

      if (selectedConnection.type !== template.connectionType) {
        onTypeChange(selectedConnection.id, template.connectionType);
      }

      if (selectedConnection.label !== template.defaultLabel) {
        onLabelChange(selectedConnection.id, template.defaultLabel);
      }

      const nextVisualStyle = (template.visualStyle ??
        "default") as VisualStyle;
      if ((selectedConnection.visualStyle ?? "default") !== nextVisualStyle) {
        onVisualStyleChange(selectedConnection.id, nextVisualStyle);
      }

      const metadata = {
        ...(selectedConnection.metadata ?? {}),
        ...(template.metadata ?? {}),
        templateId: template.id,
        templateName: template.name,
        pathStyle: template.pathStyle,
        icon: template.icon,
      };

      window.dispatchEvent(
        new CustomEvent("canvas:connection-template-applied", {
          detail: {
            connectionId: selectedConnection.id,
            templateId: template.id,
            metadata,
          },
        }),
      );

      addToRecentlyUsed(template.id);
      setTemplateFeedback(template.id);
    },
    [onLabelChange, onTypeChange, onVisualStyleChange, selectedConnection],
  );

  const handleClearTemplate = React.useCallback(() => {
    const initial = initialConnectionRef.current;
    const initialVisual = (initial.visualStyle ?? "default") as VisualStyle;
    const currentVisual = (selectedConnection.visualStyle ??
      "default") as VisualStyle;

    if (selectedConnection.type !== initial.type) {
      onTypeChange(selectedConnection.id, initial.type);
    }

    if ((selectedConnection.label ?? "") !== (initial.label ?? "")) {
      onLabelChange(selectedConnection.id, initial.label ?? "");
    }

    if (currentVisual !== initialVisual) {
      onVisualStyleChange(selectedConnection.id, initialVisual);
    }

    window.dispatchEvent(
      new CustomEvent("canvas:connection-template-cleared", {
        detail: { connectionId: selectedConnection.id },
      }),
    );
  }, [onLabelChange, onTypeChange, onVisualStyleChange, selectedConnection]);

  const canClearTemplate = React.useMemo(() => {
    const initial = initialConnectionRef.current;
    const initialVisual = (initial.visualStyle ?? "default") as VisualStyle;
    const currentVisual = (selectedConnection.visualStyle ??
      "default") as VisualStyle;

    return (
      Boolean(currentTemplateId) ||
      initial.type !== selectedConnection.type ||
      (initial.label ?? "") !== (selectedConnection.label ?? "") ||
      initialVisual !== currentVisual
    );
  }, [currentTemplateId, selectedConnection]);

  return (
    <Popover.Root defaultOpen onOpenChange={(open) => !open && onClose()}>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          className={cn(
            "z-50 w-80 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
          style={{
            position: "absolute",
            left: x,
            top: y,
          }}
        >
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Quick Templates
                </Label>
                {currentTemplateId && (
                  <span className="text-xs text-muted-foreground">
                    Applied: {currentTemplateId}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {quickTemplates.map((template) => {
                  const Icon = getTemplateIcon(template.icon);
                  const isActive = currentTemplateId === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                        isActive
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:border-primary/60 hover:bg-muted",
                      )}
                      onClick={() => handleApplyTemplate(template.id)}
                      title={template.description}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{template.name}</span>
                      {templateFeedback === template.id && (
                        <CheckCircle className="h-3 w-3 text-green-500 animate-in fade-in-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <Popover.Root
                open={templatePopoverOpen}
                onOpenChange={setTemplatePopoverOpen}
              >
                <Popover.Trigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between"
                  >
                    More Templates
                    <ChevronDown className="h-4 w-4 opacity-60" />
                  </Button>
                </Popover.Trigger>
                <Popover.Content
                  className="z-50 w-80 rounded-lg border bg-popover p-0 text-popover-foreground shadow-lg"
                  side="bottom"
                  align="start"
                  sideOffset={8}
                >
                  <Command>
                    <CommandInput
                      value={templateSearch}
                      onValueChange={setTemplateSearch}
                      placeholder="Search templates..."
                    />
                    <CommandList>
                      <CommandEmpty>No templates found.</CommandEmpty>
                      {groupedTemplates.map(({ category, templates }) => (
                        <CommandGroup
                          key={category}
                          heading={TEMPLATE_CATEGORY_LABELS[category]}
                          className={
                            templates.length === 0 ? "hidden" : undefined
                          }
                        >
                          {templates.map((template) => {
                            const Icon = getTemplateIcon(template.icon);
                            const isActive = currentTemplateId === template.id;
                            return (
                              <CommandItem
                                key={template.id}
                                value={`${template.name} ${template.defaultLabel}`}
                                onSelect={() =>
                                  handleApplyTemplate(template.id)
                                }
                                title={template.description}
                              >
                                <div className="flex w-full items-start gap-3">
                                  <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                  <div className="flex flex-1 flex-col">
                                    <span className="text-sm font-medium">
                                      {template.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {template.description}
                                    </span>
                                    <span className="text-xs text-primary/80">
                                      {template.defaultLabel}
                                    </span>
                                  </div>
                                  {isActive && (
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </Popover.Content>
              </Popover.Root>
            </div>

            <div className="space-y-2">
              <Label htmlFor="connectionLabel">Connection Label</Label>
              <Input
                id="connectionLabel"
                value={selectedConnection.label}
                onChange={(e) =>
                  onLabelChange(selectedConnection.id, e.target.value)
                }
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connectionType">Connection Type</Label>
              <Select
                value={selectedConnection.type}
                onValueChange={(value) =>
                  onTypeChange(
                    selectedConnection.id,
                    value as Connection["type"],
                  )
                }
              >
                <SelectTrigger id="connectionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {connectionTypes.map(({ value, label, icon }) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        {icon}
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visualStyle">Visual Style</Label>
              <Select
                value={selectedConnection.visualStyle || "default"}
                onValueChange={(value) =>
                  onVisualStyleChange(
                    selectedConnection.id,
                    value as VisualStyle,
                  )
                }
              >
                <SelectTrigger id="visualStyle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visualStyles.map(({ value, label, icon }) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        {icon}
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearTemplate}
                disabled={!canClearTemplate}
              >
                Clear Template
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(selectedConnection.id)}
                >
                  <Trash2Icon className="mr-1 h-4 w-4" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={onClose}>
                  Done
                </Button>
              </div>
            </div>
          </div>

          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
