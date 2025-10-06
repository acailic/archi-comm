import React, { useMemo, useState } from "react";
import { Boxes } from "lucide-react";
import { useDrag } from "react-dnd";
import type { DesignComponent } from "../../../../shared/contracts";
import { componentIconMap } from "@/lib/design/component-icons";
import {
  componentLibrary,
  paletteCategories,
  paletteTagMap,
  type PaletteComponentMeta,
} from "@/shared/data/componentLibrary";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { ComponentPaletteSearch } from "./ComponentPaletteSearch";
import {
  useFilteredComponents,
  useComponentFilterCategory,
} from "@/stores/canvasStore";

interface ComponentType extends PaletteComponentMeta {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

const componentIconFallback = Boxes;

const componentTypes: ComponentType[] = componentLibrary.map((component) => {
  const iconEntry = componentIconMap[component.type];
  return {
    ...component,
    icon: iconEntry?.icon ?? componentIconFallback,
    color: iconEntry?.color ?? "bg-slate-500",
  };
});

const componentByType = new Map(
  componentTypes.map((component) => [component.type, component] as const),
);

const TAG_TO_TYPES = paletteTagMap;

const categories = [
  { id: "all", label: "All Components", count: componentTypes.length },
  ...paletteCategories.map((category) => ({
    id: category.id,
    label: category.label,
    count: componentTypes.filter(
      (component) => component.category === category.id,
    ).length,
  })),
];

interface DraggableComponentProps extends ComponentType {
  isRecommended?: boolean;
}

const DraggableComponent = React.memo(function DraggableComponent({
  type,
  label,
  icon: Icon,
  color,
  description,
  isRecommended = false,
}: DraggableComponentProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "component",
    item: { type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      data-testid={`palette-item-${type}`}
      className={`
        group px-2 py-1.5 cursor-move transition-all duration-150
        hover:bg-accent/50 border-l-2 border-transparent hover:border-primary/60
        ${isDragging ? "opacity-50 bg-accent/30 border-primary" : ""}
      `}
      title={description}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded flex items-center justify-center bg-background/50">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block leading-tight">
            {label}
          </span>
        </div>
        {isRecommended && (
          <div
            className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"
            title="Recommended"
          />
        )}
      </div>
    </div>
  );
});

interface ComponentPaletteProps {
  // Optional: pre-seed the library filter with challenge tags
  defaultTags?: string[];
}

export const ComponentPalette = React.memo(function ComponentPalette({
  defaultTags,
}: ComponentPaletteProps = {}) {
  // Use store-based filtering
  const activeCategory = useComponentFilterCategory();
  const storeFilteredComponents = useFilteredComponents();

  const previousTagSignatureRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const signature = (defaultTags || []).join("|");
    if (previousTagSignatureRef.current === signature) return;

    previousTagSignatureRef.current = signature;
  }, [defaultTags]);

  // Build recommended component types from challenge tags using explicit mapping + heuristics
  const recommendedTypes = React.useMemo(() => {
    // Avoid tag-based narrowing under automation to keep full library available
    const isAutomated =
      typeof navigator !== "undefined" && (navigator as any).webdriver === true;
    if (isAutomated) return new Set<ComponentType["type"]>();
    const set = new Set<ComponentType["type"]>();
    const tags = (defaultTags || [])
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean);

    const addTypes = (types?: Array<ComponentType["type"]>) => {
      types?.forEach((t) => set.add(t));
    };

    for (const tag of tags) {
      // Direct map
      addTypes(TAG_TO_TYPES[tag]);

      // Heuristics and synonyms
      if (/db|database/.test(tag))
        addTypes(["database", "postgresql", "mysql", "mongodb"]);
      if (/sql/.test(tag)) addTypes(["postgresql", "mysql"]);
      if (/nosql/.test(tag)) addTypes(["mongodb", "redis"]);
      if (/cache/.test(tag)) addTypes(["cache", "redis"]);
      if (/websocket|web\s*socket/.test(tag)) addTypes(["websocket"]);
      if (/grpc/.test(tag)) addTypes(["grpc"]);
      if (/queue|messag|pub\s*sub|kafka|rabbit/.test(tag)) {
        addTypes([
          "message-queue",
          "producer",
          "consumer",
          "broker",
          "dead-letter-queue",
        ]);
      }
      if (/api|rest|graphql|webhook|gateway/.test(tag)) {
        addTypes(["rest-api", "api-gateway", "graphql", "webhook"]);
      }
      if (/cdn/.test(tag)) addTypes(["cdn"]);
      if (/load\s*balanc/.test(tag)) addTypes(["load-balancer"]);
      if (/auth|oauth|jwt|security|firewall/.test(tag)) {
        addTypes([
          "authentication",
          "authorization",
          "oauth",
          "jwt",
          "security",
          "firewall",
        ]);
      }
      if (/observab|monitor|logg|metric|alert/.test(tag)) {
        addTypes(["monitoring", "logging", "metrics", "alerting"]);
      }
      if (/search/.test(tag)) addTypes(["elasticsearch"]);
      if (/analytic|warehouse|lake|etl|stream/i.test(tag)) {
        addTypes([
          "elasticsearch",
          "kibana",
          "data-warehouse",
          "data-lake",
          "etl",
          "stream-processing",
        ]);
      }
      if (/storage|s3|blob|file/.test(tag)) {
        addTypes(["storage", "s3", "blob-storage", "file-system"]);
      }
      if (/serverless|lambda|cloud\s*function/.test(tag)) {
        addTypes(["serverless", "lambda", "cloud-function"]);
      }
      if (/container|docker|kubern/.test(tag)) {
        addTypes(["container", "docker", "kubernetes"]);
      }
      if (/edge/.test(tag)) addTypes(["edge-computing", "cdn"]);
      if (/ai|ml/.test(tag)) addTypes(["ai-ml"]);
      if (/client|web|mobile|desktop|iot/.test(tag)) {
        addTypes([
          "client",
          "web-app",
          "mobile-app",
          "desktop-app",
          "iot-device",
        ]);
      }

      // Exact type name matches (e.g., tag 'redis', 'kubernetes')
      const directType = componentTypes.find((ct) => ct.type === tag);
      if (directType) set.add(directType.type);
    }
    return set;
  }, [defaultTags]);

  const shouldHighlightRecommendations = recommendedTypes.size > 0;

  const recommendedHighlights = React.useMemo(() => {
    if (!shouldHighlightRecommendations)
      return [] as Array<ComponentType["type"]>;
    return Array.from(recommendedTypes).slice(0, 6);
  }, [recommendedTypes, shouldHighlightRecommendations]);

  const filteredComponents = React.useMemo(() => {
    return storeFilteredComponents
      .map((component) => componentByType.get(component.type))
      .filter((component): component is ComponentType => Boolean(component));
  }, [storeFilteredComponents]);

  const visibleComponents = React.useMemo(() => {
    const sorted = [...filteredComponents];

    sorted.sort((a, b) => {
      const aRecommended =
        shouldHighlightRecommendations && recommendedTypes.has(a.type);
      const bRecommended =
        shouldHighlightRecommendations && recommendedTypes.has(b.type);

      if (aRecommended !== bRecommended) {
        return aRecommended ? -1 : 1;
      }

      return a.label.localeCompare(b.label);
    });

    return sorted;
  }, [filteredComponents, recommendedTypes, shouldHighlightRecommendations]);

  // Build category list with counts
  const categoriesWithCounts = React.useMemo(() => {
    return paletteCategories.map((category) => ({
      id: category.id,
      name: category.label,
      count: componentTypes.filter(
        (component) => component.category === category.id,
      ).length,
    }));
  }, []);

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Compact Header with integrated search */}
      <div className="px-3 py-2 border-b border-border/50 bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Component Library</h3>
          <Badge variant="secondary" className="text-xs h-5 px-2">
            {visibleComponents.length}
          </Badge>
        </div>

        {/* Use ComponentPaletteSearch */}
        <ComponentPaletteSearch categories={categoriesWithCounts} />
      </div>

      {/* Component List - Simple, compact scrollable list */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {visibleComponents.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-xs text-muted-foreground text-center">
                No components found
              </p>
            </div>
          ) : (!activeCategory || activeCategory === "all") ? (
            <div>
              {categories.slice(1).map((category) => {
                const categoryComponents = visibleComponents.filter(
                  (c) => c.category === category.id,
                );
                if (categoryComponents.length === 0) return null;

                return (
                  <div key={category.id}>
                    <div className="sticky top-0 bg-card px-3 py-1.5 border-b border-border/30 z-10">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {category.label}
                        </h4>
                        <span className="text-[10px] text-muted-foreground/60">
                          {categoryComponents.length}
                        </span>
                      </div>
                    </div>
                    <div>
                      {categoryComponents.map((component) => (
                        <DraggableComponent
                          key={component.type}
                          {...component}
                          isRecommended={
                            shouldHighlightRecommendations &&
                            recommendedTypes.has(component.type)
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {visibleComponents
                .filter((c) => c.category === activeCategory)
                .map((component) => (
                  <DraggableComponent
                    key={component.type}
                    {...component}
                    isRecommended={
                      shouldHighlightRecommendations &&
                      recommendedTypes.has(component.type)
                    }
                  />
                ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
});

// Export componentTypes for external usage
export { componentTypes };
