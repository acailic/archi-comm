// Dynamic loader for @tiptap modules with caching

let reactModPromise: Promise<any> | null = null;
let starterKitPromise: Promise<any> | null = null;
let extensionsPromise: Promise<any> | null = null;
let highlightPromise: Promise<any> | null = null;
let transcriptExtensionsPromise: Promise<any> | null = null;

export async function loadTiptapReact() {
  if (!reactModPromise) {
    reactModPromise = import('@tiptap/react');
  }
  return reactModPromise;
}

export async function loadTiptapStarterKit() {
  if (!starterKitPromise) {
    starterKitPromise = import('@tiptap/starter-kit');
  }
  return starterKitPromise;
}

export async function loadTiptapExtensions() {
  if (!extensionsPromise) {
    extensionsPromise = Promise.all([
      import('@tiptap/extension-text-style'),
      import('@tiptap/extension-color'),
      import('@tiptap/extension-list-item'),
    ]).then(([TextStyle, Color, ListItem]) => ({ TextStyle: TextStyle.default, Color: Color.default, ListItem: ListItem.default }));
  }
  return extensionsPromise;
}

export async function loadTiptapHighlight() {
  if (!highlightPromise) {
    highlightPromise = import('@tiptap/extension-highlight');
  }
  return highlightPromise;
}

export async function loadTiptapTranscriptExtensions() {
  if (!transcriptExtensionsPromise) {
    transcriptExtensionsPromise = Promise.all([
      import('@tiptap/extension-text-style'),
      import('@tiptap/extension-color'),
      import('@tiptap/extension-list-item'),
      import('@tiptap/extension-highlight'),
    ]).then(([TextStyle, Color, ListItem, Highlight]) => ({ 
      TextStyle: TextStyle.default, 
      Color: Color.default, 
      ListItem: ListItem.default,
      Highlight: Highlight.default 
    }));
  }
  return transcriptExtensionsPromise;
}

export async function preloadTiptap() {
  try {
    await Promise.all([loadTiptapReact(), loadTiptapStarterKit(), loadTiptapExtensions()]);
  } catch (e) {
    console.warn('Failed to preload TipTap modules:', e);
  }
}

