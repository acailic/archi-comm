/**
 * src/packages/ui/components/panels/ComponentPaletteSearch.tsx
 * Search and filter component for component palette with real-time filtering
 * Provides text search and category dropdown with component counts
 * RELEVANT FILES: src/stores/canvasStore.ts, src/packages/ui/components/panels/ComponentPalette.tsx
 */

import * as Popover from "@radix-ui/react-popover";
import { Filter, Search, X } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cx } from "@/lib/design/design-system";
import {
  useComponentFilterCategory,
  useComponentSearchQuery,
  useCanvasActions,
} from "@/stores/canvasStore";

/**
 * Debounce helper for search input
 */
function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

interface ComponentPaletteSearchProps {
  categories: Array<{ id: string; name: string; count: number }>;
  className?: string;
}

export const ComponentPaletteSearch = memo<ComponentPaletteSearchProps>(
  ({ categories, className }) => {
    const searchQuery = useComponentSearchQuery();
    const filterCategory = useComponentFilterCategory();
    const actions = useCanvasActions();
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [localQuery, setLocalQuery] = useState(searchQuery);

    // Debounced search update to store (200ms delay)
    const debouncedUpdateSearch = useDebouncedCallback(
      (value: string) => {
        actions.setComponentSearchQuery(value);
      },
      200
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLocalQuery(value); // Update local state immediately for responsive UI
        debouncedUpdateSearch(value); // Update store with debounce
      },
      [debouncedUpdateSearch],
    );

    const handleClearSearch = useCallback(() => {
      setLocalQuery("");
      actions.setComponentSearchQuery("");
    }, [actions]);

    const handleCategorySelect = useCallback(
      (categoryId: string | null) => {
        actions.setComponentFilterCategory(categoryId);
        setIsFilterOpen(false);
      },
      [actions],
    );

    const activeCategory = categories.find((c) => c.id === filterCategory);

    return (
      <div className={cx("flex items-center gap-2", className)}>
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={localQuery}
            onChange={handleSearchChange}
            placeholder="Search components..."
            className={cx(
              "w-full pl-9 pr-9 py-2",
              "border-2 border-gray-300 rounded-lg",
              "focus:border-blue-500 focus:outline-none",
              "text-sm",
              "transition-colors",
            )}
          />
          {localQuery ? (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Category filter */}
        <Popover.Root open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <Popover.Trigger asChild>
            <button
              className={cx(
                "flex items-center gap-2 px-3 py-2",
                "border-2 rounded-lg",
                "text-sm font-medium",
                "transition-colors",
                filterCategory
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
              )}
              aria-label="Filter by category"
            >
              <Filter className="w-4 h-4" />
              {activeCategory ? activeCategory.name : "Filter"}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className={cx(
                "z-50 w-56",
                "bg-white border-2 border-gray-900 rounded-lg shadow-lg",
                "p-2",
              )}
              sideOffset={8}
              align="end"
            >
              <div className="space-y-1">
                <CategoryOption
                  name="All Components"
                  count={categories.reduce((sum, c) => sum + c.count, 0)}
                  active={!filterCategory}
                  onClick={() => handleCategorySelect(null)}
                />
                <div className="h-px bg-gray-200 my-2" />
                {categories.map((category) => (
                  <CategoryOption
                    key={category.id}
                    name={category.name}
                    count={category.count}
                    active={filterCategory === category.id}
                    onClick={() => handleCategorySelect(category.id)}
                  />
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    );
  },
);

ComponentPaletteSearch.displayName = "ComponentPaletteSearch";

interface CategoryOptionProps {
  name: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function CategoryOption({ name, count, active, onClick }: CategoryOptionProps) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "w-full flex items-center justify-between",
        "px-3 py-2 rounded-md",
        "text-sm text-left",
        "transition-colors",
        active ? "bg-blue-500 text-white" : "hover:bg-gray-100 text-gray-700",
      )}
    >
      <span>{name}</span>
      <span
        className={cx("text-xs", active ? "text-blue-200" : "text-gray-500")}
      >
        {count}
      </span>
    </button>
  );
}
