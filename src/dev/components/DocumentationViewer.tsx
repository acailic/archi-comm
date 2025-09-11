// src/dev/components/DocumentationViewer.tsx
// Displays generated component documentation in a tabbed interface
// RELEVANT FILES: ../types.ts, ../utils/documentationGenerator.ts, ../ScenarioViewer.tsx

import React, { useMemo, useState } from 'react';
import type { ComponentDocumentation, CodeExample } from '../types';

type TabKey = 'api' | 'examples' | 'best' | 'a11y';

export interface DocumentationViewerProps {
  documentation: ComponentDocumentation;
  onTryExample?: (example: CodeExample) => void;
}

export function DocumentationViewer({ documentation, onTryExample }: DocumentationViewerProps) {
  const [active, setActive] = useState<TabKey>('api');
  const tabs = useMemo(() => {
    const list: Array<{ key: TabKey; label: string; hidden?: boolean }> = [
      { key: 'api', label: 'API Reference', hidden: !(documentation.propsTable?.length || documentation.variantInfo?.length) },
      { key: 'examples', label: 'Usage Examples', hidden: !(documentation.examples?.length) },
      { key: 'best', label: 'Best Practices', hidden: !(documentation.bestPractices?.length) },
      { key: 'a11y', label: 'Accessibility', hidden: !documentation.accessibility },
    ];
    return list.filter(t => !t.hidden);
  }, [documentation]);

  // Ensure valid tab when content changes
  React.useEffect(() => {
    if (tabs.length && !tabs.find(t => t.key === active)) setActive(tabs[0].key);
  }, [tabs, active]);

  return (
    <div className="flex flex-col h-full">
      <header className="border-b p-3">
        <div className="text-lg font-semibold">{documentation.componentName}</div>
        {documentation.overview && <p className="text-sm text-muted-foreground mt-1">{documentation.overview}</p>}
        <nav className="mt-3 flex gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-3 py-1 rounded border text-sm ${active === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="p-3 overflow-auto grow">
        {active === 'api' && <APIReferenceTab documentation={documentation} />}
        {active === 'examples' && (
          <UsageExamplesTab documentation={documentation} onTryExample={onTryExample} />
        )}
        {active === 'best' && <BestPracticesTab documentation={documentation} />}
        {active === 'a11y' && <AccessibilityTab documentation={documentation} />}
      </main>
    </div>
  );
}

function APIReferenceTab({ documentation }: { documentation: ComponentDocumentation }) {
  return (
    <div className="space-y-4">
      {documentation.propsTable?.length ? (
        <section>
          <h3 className="font-medium mb-2">Props</h3>
          <ul className="space-y-1">
            {documentation.propsTable.map((p, i) => (
              <li key={i} className="text-sm">
                <code className="font-mono">{p.name}</code>: <code className="font-mono">{p.type}</code>
                {p.required ? ' (required)' : ''}
                {p.defaultValue ? `, default: ${p.defaultValue}` : ''}
                {p.description ? ` — ${p.description}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {documentation.variantInfo?.length ? (
        <section>
          <h3 className="font-medium mb-2">Variants</h3>
          <ul className="space-y-1">
            {documentation.variantInfo.map((v, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{v.name}</span>: {v.values.join(', ')}
                {v.description ? ` — ${v.description}` : ''}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function UsageExamplesTab({ documentation, onTryExample }: { documentation: ComponentDocumentation; onTryExample?: (ex: CodeExample) => void }) {
  return (
    <div className="space-y-6">
      {documentation.examples?.map((ex, i) => (
        <section key={i} className="border rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-medium">{ex.title}</h4>
              <p className="text-sm text-muted-foreground">{ex.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                className="text-sm px-2 py-1 border rounded"
                onClick={() => navigator.clipboard?.writeText(ex.snippet.code)}
              >
                Copy
              </button>
              {onTryExample ? (
                <button className="text-sm px-2 py-1 border rounded" onClick={() => onTryExample(ex.snippet)}>
                  Try it
                </button>
              ) : null}
            </div>
          </div>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto"><code>{ex.snippet.code}</code></pre>
        </section>
      ))}
      {!documentation.examples?.length && <p className="text-sm">No examples available.</p>}
    </div>
  );
}

function BestPracticesTab({ documentation }: { documentation: ComponentDocumentation }) {
  return (
    <div>
      {documentation.bestPractices?.length ? (
        <ul className="list-disc ml-5 space-y-1 text-sm">
          {documentation.bestPractices.map((bp, i) => (
            <li key={i}>{bp}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm">No best practices documented.</p>
      )}
    </div>
  );
}

function AccessibilityTab({ documentation }: { documentation: ComponentDocumentation }) {
  const a11y = documentation.accessibility;
  if (!a11y) return <p className="text-sm">No accessibility documentation.</p>;
  return (
    <div className="space-y-3 text-sm">
      {a11y.aria?.length ? (
        <section>
          <h4 className="font-medium">ARIA</h4>
          <ul className="list-disc ml-5">{a11y.aria.map((x, i) => (<li key={i}>{x}</li>))}</ul>
        </section>
      ) : null}
      {a11y.keyboard?.length ? (
        <section>
          <h4 className="font-medium">Keyboard</h4>
          <ul className="list-disc ml-5">{a11y.keyboard.map((x, i) => (<li key={i}>{x}</li>))}</ul>
        </section>
      ) : null}
      {a11y.screenReader?.length ? (
        <section>
          <h4 className="font-medium">Screen Reader</h4>
          <ul className="list-disc ml-5">{a11y.screenReader.map((x, i) => (<li key={i}>{x}</li>))}</ul>
        </section>
      ) : null}
    </div>
  );
}

export default DocumentationViewer;

