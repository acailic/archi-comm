import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FixedSizeList as List,
  type FixedSizeList,
  type ListChildComponentProps,
} from 'react-window';
import {
  CheckSquare,
  Copy,
  Filter,
  MoreHorizontal,
  Search,
  Target,
  Trash2,
} from 'lucide-react';

import { cn } from '@core/utils';
import { Button } from '@ui/components/ui/button';
import { Checkbox } from '@ui/components/ui/checkbox';
import { Input } from '@ui/components/ui/input';
import { Badge } from '@ui/components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@ui/components/ui/context-menu';
import { ScrollArea } from '@ui/components/ui/scroll-area';
import { sanitizeHtmlContent } from '@/lib/canvas/CanvasAnnotations';
import type { Annotation } from '@/shared/contracts';

export type AnnotationType = Annotation['type'];

export interface AnnotationSidebarProps {
  annotations: Annotation[];
  selectedAnnotation: string | null;
  onAnnotationSelect: (annotationId: string) => void;
  onAnnotationDelete: (annotationId: string) => void;
  onAnnotationFocus: (annotationId: string) => void;
  onAnnotationUpdate?: (annotation: Annotation) => void;
  onAnnotationDuplicate?: (annotation: Annotation) => void;
  className?: string;
}

const ITEM_HEIGHT = 112;

const typeStyles: Record<AnnotationType, { border: string; accent: string; text: string }> = {
  comment: {
    border: 'border-blue-200',
    accent: 'bg-blue-50/70',
    text: 'text-blue-900',
  },
  note: {
    border: 'border-amber-200',
    accent: 'bg-amber-50/70',
    text: 'text-amber-900',
  },
  label: {
    border: 'border-emerald-200',
    accent: 'bg-emerald-50/70',
    text: 'text-emerald-900',
  },
  arrow: {
    border: 'border-slate-200',
    accent: 'bg-slate-50/70',
    text: 'text-slate-900',
  },
  highlight: {
    border: 'border-yellow-200',
    accent: 'bg-yellow-50/70',
    text: 'text-yellow-900',
  },
};

interface SidebarItemData {
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  selectedIds: Set<string>;
  onSelect: (annotationId: string, focus?: boolean) => void;
  onToggleSelection: (annotationId: string) => void;
  onDelete: (annotationId: string) => void;
  onDuplicate?: (annotation: Annotation) => void;
  onResolve?: (annotation: Annotation, resolved: boolean) => void;
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const previewContent = (content: string): string => {
  const sanitized = sanitizeHtmlContent(content ?? '');
  const stripped = sanitized
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length > 140 ? `${stripped.slice(0, 140)}…` : stripped;
};

const AnnotationRow: React.FC<ListChildComponentProps<SidebarItemData>> = ({
  index,
  style,
  data,
}) => {
  const annotation = data.annotations[index];
  const isActive = data.selectedAnnotationId === annotation.id;
  const isMultiSelected = data.selectedIds.has(annotation.id);
  const tokens = typeStyles[annotation.type];

  const handleSelect = () => data.onSelect(annotation.id, true);
  const handleToggle = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
    data.onToggleSelection(annotation.id);
  };

  const handleDuplicate = () => {
    data.onDuplicate?.(annotation);
  };

  const handleToggleResolved = () => {
    if (!data.onResolve) return;
    data.onResolve(annotation, !(annotation.resolved ?? false));
  };

  return (
    <div style={style} className='px-2 py-2'>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            role='row'
            tabIndex={-1}
            onClick={() => data.onSelect(annotation.id)}
            className={cn(
              'group flex h-full w-full cursor-pointer items-start gap-3 rounded-xl border bg-background/95 p-3 shadow-sm transition-all',
              tokens.border,
              isActive
                ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                : 'hover:shadow-md',
            )}
          >
            <Checkbox
              checked={isMultiSelected}
              onCheckedChange={() => data.onToggleSelection(annotation.id)}
              onClick={handleToggle}
              aria-label={`Select annotation ${annotation.id}`}
              className='mt-1'
            />
            <div className='min-w-0 flex-1 space-y-2'>
              <div className='flex items-start justify-between gap-2'>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className={cn('text-[11px] uppercase', tokens.text)}>
                    {annotation.type}
                  </Badge>
                  {annotation.resolved && (
                    <Badge variant='secondary' className='bg-emerald-100 text-emerald-700'>
                      Resolved
                    </Badge>
                  )}
                </div>
                <span className='text-xs text-muted-foreground'>
                  {formatTimestamp(annotation.timestamp)}
                </span>
              </div>
              <div
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm leading-relaxed shadow-inner',
                  tokens.accent,
                )}
              >
                <p className={cn('line-clamp-3', tokens.text)}>{previewContent(annotation.content)}</p>
              </div>
              <div className='flex items-center justify-between text-xs text-muted-foreground'>
                <span>{annotation.author ?? 'Unknown author'}</span>
                <button
                  type='button'
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onSelect(annotation.id, true);
                  }}
                  className='inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primary opacity-0 transition-opacity group-hover:opacity-100'
                >
                  <Target className='h-3 w-3' /> Focus
                </button>
              </div>
            </div>
            <button
              type='button'
              aria-label='More actions'
              onClick={(event) => event.stopPropagation()}
              className='mt-1 text-muted-foreground transition-colors hover:text-foreground'
            >
              <MoreHorizontal className='h-4 w-4' />
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className='w-48'>
          <ContextMenuItem onClick={() => data.onSelect(annotation.id, true)}>
            Focus
          </ContextMenuItem>
          <ContextMenuItem onClick={handleSelect}>Edit…</ContextMenuItem>
          <ContextMenuItem onClick={handleDuplicate} disabled={!data.onDuplicate}>
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem onClick={handleToggleResolved}>
            {annotation.resolved ? 'Mark unresolved' : 'Mark resolved'}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => data.onDelete(annotation.id)}
            className='text-destructive focus:text-destructive'
          >
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};

export const AnnotationSidebar: React.FC<AnnotationSidebarProps> = ({
  annotations,
  selectedAnnotation,
  onAnnotationSelect,
  onAnnotationDelete,
  onAnnotationFocus,
  onAnnotationUpdate,
  onAnnotationDuplicate,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<Set<AnnotationType>>(new Set());
  const [selectedAuthors, setSelectedAuthors] = useState<Set<string>>(new Set());
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<FixedSizeList<SidebarItemData>>(null);
  const [listHeight, setListHeight] = useState(320);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const element = listContainerRef.current;
    if (!element) return undefined;

    const updateHeight = () => {
      const bounds = element.getBoundingClientRect();
      setListHeight(bounds.height);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const authors = useMemo(() => {
    const unique = new Set<string>();
    annotations.forEach((annotation) => {
      if (annotation.author) {
        unique.add(annotation.author);
      }
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [annotations]);

  const filteredAnnotations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return annotations
      .filter((annotation) => {
        if (selectedTypes.size > 0 && !selectedTypes.has(annotation.type)) {
          return false;
        }
        if (selectedAuthors.size > 0 && (!annotation.author || !selectedAuthors.has(annotation.author))) {
          return false;
        }
        if (resolvedFilter !== 'all') {
          const isResolved = annotation.resolved ?? false;
          if (resolvedFilter === 'resolved' && !isResolved) return false;
          if (resolvedFilter === 'unresolved' && isResolved) return false;
        }
        if (!query) return true;
        return (
          annotation.content.toLowerCase().includes(query) ||
          annotation.author?.toLowerCase().includes(query) ||
          annotation.id.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [annotations, resolvedFilter, searchQuery, selectedAuthors, selectedTypes]);

  useEffect(() => {
    setHighlightIndex((current) => {
      if (filteredAnnotations.length === 0) return 0;
      return Math.max(0, Math.min(current, filteredAnnotations.length - 1));
    });
  }, [filteredAnnotations.length]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollToItem(highlightIndex);
  }, [highlightIndex]);

  const toggleType = useCallback((type: AnnotationType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const toggleAuthor = useCallback((author: string) => {
    setSelectedAuthors((prev) => {
      const next = new Set(prev);
      if (next.has(author)) {
        next.delete(author);
      } else {
        next.add(author);
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedTypes(new Set());
    setSelectedAuthors(new Set());
    setResolvedFilter('all');
  }, []);

  const toggleSelection = useCallback((annotationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(annotationId)) {
        next.delete(annotationId);
      } else {
        next.add(annotationId);
      }
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === filteredAnnotations.length) {
        return new Set();
      }
      return new Set(filteredAnnotations.map((annotation) => annotation.id));
    });
  }, [filteredAnnotations]);

  const handleSelect = useCallback(
    (annotationId: string, focus = false) => {
      onAnnotationSelect(annotationId);
      if (focus) {
        onAnnotationFocus(annotationId);
      }
    },
    [onAnnotationFocus, onAnnotationSelect],
  );

  const handleBulkDelete = useCallback(() => {
    selectedIds.forEach((id) => onAnnotationDelete(id));
    setSelectedIds(new Set());
  }, [onAnnotationDelete, selectedIds]);

  const handleBulkResolve = useCallback(
    (resolved: boolean) => {
      if (!onAnnotationUpdate) return;
      const lookup = new Map(annotations.map((annotation) => [annotation.id, annotation]));
      selectedIds.forEach((id) => {
        const annotation = lookup.get(id);
        if (!annotation) return;
        onAnnotationUpdate({ ...annotation, resolved });
      });
      setSelectedIds(new Set());
    },
    [annotations, onAnnotationUpdate, selectedIds],
  );

  const handleBulkDuplicate = useCallback(() => {
    if (!onAnnotationDuplicate) return;
    const lookup = new Map(annotations.map((annotation) => [annotation.id, annotation]));
    selectedIds.forEach((id) => {
      const annotation = lookup.get(id);
      if (!annotation) return;
      onAnnotationDuplicate(annotation);
    });
    setSelectedIds(new Set());
  }, [annotations, onAnnotationDuplicate, selectedIds]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (filteredAnnotations.length === 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightIndex((current) => {
          const next = Math.min(current + 1, filteredAnnotations.length - 1);
          return next;
        });
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightIndex((current) => Math.max(0, current - 1));
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const annotation = filteredAnnotations[highlightIndex];
        if (annotation) {
          handleSelect(annotation.id, true);
        }
      }
      if (event.key === ' ') {
        event.preventDefault();
        const annotation = filteredAnnotations[highlightIndex];
        if (annotation) {
          toggleSelection(annotation.id);
        }
      }
    },
    [filteredAnnotations, handleSelect, highlightIndex, toggleSelection],
  );

  const itemData = useMemo<SidebarItemData>(
    () => ({
      annotations: filteredAnnotations,
      selectedAnnotationId: selectedAnnotation,
      selectedIds,
      onSelect: handleSelect,
      onToggleSelection: toggleSelection,
      onDelete: onAnnotationDelete,
      onDuplicate: onAnnotationDuplicate,
      onResolve: onAnnotationUpdate
        ? (annotation, resolved) => onAnnotationUpdate({ ...annotation, resolved })
        : undefined,
    }),
    [
      filteredAnnotations,
      handleSelect,
      onAnnotationDelete,
      onAnnotationDuplicate,
      onAnnotationUpdate,
      selectedAnnotation,
      selectedIds,
      toggleSelection,
    ],
  );

  const listHeightValue = Math.max(ITEM_HEIGHT, listHeight);

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col gap-3 border-l border-border bg-background/95 p-4',
        className,
      )}
      role='complementary'
      aria-label='Annotations panel'
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <header className='space-y-3'>
        <div className='flex items-center justify-between gap-2'>
          <h2 className='text-sm font-semibold uppercase tracking-wide text-muted-foreground'>
            Annotations
          </h2>
          <Button variant='ghost' size='sm' onClick={clearFilters} className='h-7 px-2 text-[11px]'>
            Clear filters
          </Button>
        </div>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder='Search annotations'
            className='pl-9'
          />
        </div>
        <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
          <Filter className='h-3 w-3' />
          <span>Filters</span>
        </div>
        <ScrollArea className='h-16 rounded-md border border-dashed border-border/60 p-2'>
          <div className='flex flex-wrap gap-2'>
            {(Object.keys(typeStyles) as AnnotationType[]).map((type) => {
              const isSelected = selectedTypes.has(type);
              return (
                <Badge
                  key={type}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => toggleType(type)}
                  className={cn('cursor-pointer select-none capitalize', isSelected ? 'bg-primary text-primary-foreground' : undefined)}
                >
                  {type}
                </Badge>
              );
            })}
            {authors.map((author) => {
              const isSelected = selectedAuthors.has(author);
              return (
                <Badge
                  key={author}
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => toggleAuthor(author)}
                  className={cn('cursor-pointer select-none', isSelected ? 'bg-secondary text-secondary-foreground' : undefined)}
                >
                  {author}
                </Badge>
              );
            })}
            <Badge
              variant={resolvedFilter === 'resolved' ? 'default' : 'outline'}
              onClick={() => setResolvedFilter(resolvedFilter === 'resolved' ? 'all' : 'resolved')}
              className='cursor-pointer select-none'
            >
              Resolved
            </Badge>
            <Badge
              variant={resolvedFilter === 'unresolved' ? 'default' : 'outline'}
              onClick={() => setResolvedFilter(resolvedFilter === 'unresolved' ? 'all' : 'unresolved')}
              className='cursor-pointer select-none'
            >
              Unresolved
            </Badge>
          </div>
        </ScrollArea>
      </header>

      <div className='flex items-center justify-between gap-2 border-y border-border/60 py-2 text-xs'>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={selectAllFiltered}
            disabled={filteredAnnotations.length === 0}
            className='h-7 px-2'
          >
            <CheckSquare className='mr-2 h-3 w-3' />
            {selectedIds.size === filteredAnnotations.length && selectedIds.size > 0
              ? 'Deselect all'
              : 'Select all'}
          </Button>
          <span className='text-muted-foreground'>
            {selectedIds.size} selected
          </span>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled={selectedIds.size === 0}
            onClick={() => handleBulkResolve(true)}
            className='h-7 px-2'
          >
            Resolve
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled={selectedIds.size === 0}
            onClick={() => handleBulkResolve(false)}
            className='h-7 px-2'
          >
            Reopen
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled={selectedIds.size === 0 || !onAnnotationDuplicate}
            onClick={handleBulkDuplicate}
            className='h-7 px-2'
          >
            <Copy className='mr-1 h-3 w-3' /> Duplicate
          </Button>
          <Button
            type='button'
            variant='destructive'
            size='sm'
            disabled={selectedIds.size === 0}
            onClick={handleBulkDelete}
            className='h-7 px-2'
          >
            <Trash2 className='mr-1 h-3 w-3' /> Delete
          </Button>
        </div>
      </div>

      <div ref={listContainerRef} className='flex-1 overflow-hidden rounded-xl border border-border/60 bg-muted/40'>
        {filteredAnnotations.length === 0 ? (
          <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
            No annotations match the current filters.
          </div>
        ) : (
          <List
            ref={listRef}
            height={listHeightValue}
            width='100%'
            itemCount={filteredAnnotations.length}
            itemSize={ITEM_HEIGHT}
            itemData={itemData}
            initialScrollOffset={highlightIndex * ITEM_HEIGHT}
          >
            {AnnotationRow}
          </List>
        )}
      </div>
    </div>
  );
};

AnnotationSidebar.displayName = 'AnnotationSidebar';
