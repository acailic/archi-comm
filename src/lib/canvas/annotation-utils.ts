import type {
  Annotation,
  AnnotationReply,
  AnnotationStyle,
} from '@/shared/contracts';
import type {
  CanvasAnnotation as InternalCanvasAnnotation,
  AnnotationStyle as InternalAnnotationStyle,
} from './CanvasAnnotations';

const ANNOTATION_EXPORT_VERSION = 1;

interface AnnotationExportPayload {
  version: number;
  exportedAt: string;
  annotations: Annotation[];
}

const DEFAULT_DIMENSIONS = {
  width: 220,
  height: 120,
};

const cloneReplies = (replies?: AnnotationReply[]): AnnotationReply[] =>
  replies?.map((reply) => ({ ...reply })) ?? [];

const cloneStyle = (
  style?: AnnotationStyle | InternalAnnotationStyle,
): AnnotationStyle | undefined => {
  if (!style) return undefined;
  return { ...style };
};

const normalizeAnnotation = (annotation: Annotation): Annotation => ({
  ...annotation,
  width: annotation.width ?? DEFAULT_DIMENSIONS.width,
  height: annotation.height ?? DEFAULT_DIMENSIONS.height,
  replies: cloneReplies(annotation.replies),
  style: cloneStyle(annotation.style),
});

export const exportAnnotationsToJSON = (
  annotations: Annotation[],
): string => {
  const payload: AnnotationExportPayload = {
    version: ANNOTATION_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    annotations: annotations.map(normalizeAnnotation),
  };

  return JSON.stringify(payload, null, 2);
};

export const importAnnotationsFromJSON = (data: string): Annotation[] => {
  if (!data.trim()) return [];

  const parsed = JSON.parse(data) as
    | Annotation[]
    | Partial<AnnotationExportPayload>
    | undefined;

  if (!parsed) return [];

  const annotations = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.annotations)
      ? parsed.annotations
      : [];

  return annotations
    .filter((annotation): annotation is Annotation =>
      Boolean(annotation && annotation.id && annotation.type && annotation.content !== undefined),
    )
    .map((annotation) => normalizeAnnotation(annotation));
};

export const searchAnnotations = (
  annotations: Annotation[],
  query: string,
): Annotation[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return annotations;

  return annotations.filter((annotation) => {
    const haystacks = [
      annotation.content,
      annotation.author,
      annotation.id,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return haystacks.some((haystack) => haystack.includes(normalizedQuery));
  });
};

export const filterAnnotationsByType = (
  annotations: Annotation[],
  types: Annotation['type'][],
): Annotation[] => {
  if (!types.length) return annotations;
  const allowed = new Set(types);
  return annotations.filter((annotation) => allowed.has(annotation.type));
};

export const filterAnnotationsByAuthor = (
  annotations: Annotation[],
  authors: string[],
): Annotation[] => {
  if (!authors.length) return annotations;
  const allowed = new Set(authors.map((author) => author.toLowerCase()));
  return annotations.filter((annotation) =>
    annotation.author ? allowed.has(annotation.author.toLowerCase()) : false,
  );
};

export type AnnotationWithReplies = Annotation & {
  replies?: AnnotationReply[];
};

const ensureAuthor = (annotation: InternalCanvasAnnotation): string =>
  annotation.author ?? 'Unknown';

const ensureStyle = (
  style: InternalAnnotationStyle | undefined,
): InternalAnnotationStyle => ({
  backgroundColor: '#ffffff',
  borderColor: '#e2e8f0',
  textColor: '#0f172a',
  fontSize: 14,
  fontWeight: 'normal',
  opacity: 1,
  borderRadius: 8,
  borderWidth: 1,
  ...style,
});

export const canvasAnnotationToContract = (
  annotation: InternalCanvasAnnotation,
): AnnotationWithReplies => ({
  id: annotation.id,
  type: annotation.type,
  content: annotation.content,
  x: annotation.x,
  y: annotation.y,
  width: annotation.width ?? DEFAULT_DIMENSIONS.width,
  height: annotation.height ?? DEFAULT_DIMENSIONS.height,
  timestamp: annotation.timestamp,
  author: ensureAuthor(annotation),
  resolved: annotation.resolved,
  style: ensureStyle(annotation.style),
  replies: cloneReplies(annotation.replies),
  visible: annotation.visible,
  zIndex: annotation.zIndex,
  color: annotation.color,
  fontSize: annotation.style?.fontSize,
  borderWidth: annotation.style?.borderWidth,
  borderStyle: annotation.style?.borderStyle,
});

export const mergeAnnotationUpdates = (
  base: AnnotationWithReplies,
  updates: Partial<AnnotationWithReplies>,
): AnnotationWithReplies => ({
  ...base,
  ...updates,
  style: updates.style ? { ...base.style, ...updates.style } : base.style,
  replies: updates.replies ?? base.replies,
});

export const contractAnnotationToCanvas = (
  annotation: AnnotationWithReplies,
): InternalCanvasAnnotation => ({
  id: annotation.id,
  type: annotation.type,
  x: annotation.x,
  y: annotation.y,
  width: annotation.width ?? DEFAULT_DIMENSIONS.width,
  height: annotation.height ?? DEFAULT_DIMENSIONS.height,
  content: annotation.content,
  author: annotation.author ?? 'Unknown',
  timestamp: annotation.timestamp,
  color: annotation.color ?? '#3b82f6',
  resolved: annotation.resolved ?? false,
  replies: cloneReplies(annotation.replies),
  style: ensureStyle(annotation.style as InternalAnnotationStyle | undefined),
});

export const validateAnnotationContent = (
  type: Annotation['type'],
  content: string,
): boolean => {
  const normalized = content?.replace(/<[^>]+>/g, '').trim() ?? '';

  if (type === 'highlight' || type === 'arrow') {
    return true;
  }

  return normalized.length > 0;
};

// Style tokens for annotation types used in AnnotationLayer
export const annotationStyleTokens = {
  comment: {
    background: 'bg-amber-50/90',
    border: 'border-amber-200',
    text: 'text-amber-900', 
    accent: 'bg-amber-100',
    shadow: 'shadow-md',
  },
  note: {
    background: 'bg-blue-50/90',
    border: 'border-blue-200',
    text: 'text-blue-900',
    accent: 'bg-blue-100', 
    shadow: 'shadow-md',
  },
  label: {
    background: 'bg-emerald-50/90',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    accent: 'bg-emerald-100',
    shadow: 'shadow-sm',
  },
  arrow: {
    background: 'bg-slate-50/90',
    border: 'border-slate-200',
    text: 'text-slate-900',
    accent: 'bg-slate-100',
    shadow: 'shadow-sm',
  },
  highlight: {
    background: 'bg-yellow-50/30',
    border: 'border-yellow-300 border-dashed',
    text: 'text-yellow-900',
    accent: 'bg-yellow-100',
    shadow: 'shadow-none',
  },
} as const;
