import React from 'react';
import { Badge } from '@ui/components/ui/badge';
import { cn } from '@core/utils';
import type { Annotation } from '@/shared/contracts';
import { sanitizeHtmlContent } from '@/lib/canvas/CanvasAnnotations';

const typeLabel: Record<Annotation['type'], string> = {
  comment: 'Comment',
  note: 'Note',
  label: 'Label',
  arrow: 'Arrow',
  highlight: 'Highlight',
};

interface AnnotationPreviewProps {
  annotation: Annotation;
  className?: string;
}

export const AnnotationPreview: React.FC<AnnotationPreviewProps> = ({
  annotation,
  className,
}) => {
  const sanitizedContent = sanitizeHtmlContent(annotation.content);
  const label = typeLabel[annotation.type];
  const resolved = annotation.resolved ?? false;
  const borderStyle = annotation.borderStyle ?? annotation.style?.borderStyle ?? 'solid';
  const borderWidth = annotation.borderWidth ?? annotation.style?.borderWidth ?? 1;

  return (
    <div
      className={cn(
        'flex min-h-[160px] flex-col gap-2 rounded-xl border bg-background/90 p-4 shadow-sm',
        resolved ? 'opacity-75 ring-2 ring-emerald-500/40' : 'ring-1 ring-border/60',
        className,
      )}
      style={{
        borderStyle,
        borderWidth,
        borderColor:
          annotation.style?.borderColor ??
          (annotation.type === 'highlight' ? '#facc15' : '#cbd5f5'),
        backgroundColor: annotation.style?.backgroundColor,
        color: annotation.style?.textColor,
      }}
    >
      <div className='flex items-center justify-between'>
        <Badge variant='outline' className='uppercase tracking-wide'>
          {label}
        </Badge>
        <span className='text-xs text-muted-foreground'>
          {new Date(annotation.timestamp).toLocaleString()}
        </span>
      </div>
      <div
        className='prose prose-sm max-w-none text-foreground'
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
      {resolved && (
        <p className='text-xs font-semibold text-emerald-600'>Marked as resolved</p>
      )}
    </div>
  );
};

AnnotationPreview.displayName = 'AnnotationPreview';
