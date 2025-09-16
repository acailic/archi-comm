import React from 'react';
import type { DesignData } from '@/shared/contracts';

interface LearningBreadcrumbsProps {
  design: DesignData;
}

const conceptMap: Record<string, string> = {
  'api-gateway': 'API Gateway',
  'load-balancer': 'Traffic Mgmt',
  'cache': 'Caching',
  'redis': 'Caching',
  'message-queue': 'Event-Driven',
  'dead-letter-queue': 'Reliability',
  'monitoring': 'Observability',
  'logging': 'Observability',
  'metrics': 'Observability',
  'database': 'Persistence',
  'postgresql': 'Persistence',
  'mongodb': 'Persistence',
  'dynamodb': 'Persistence',
  'websocket': 'Realtime',
};

const nextUp: Record<string, string> = {
  'Caching': 'Try adding a cache invalidation plan.',
  'Observability': 'Add SLOs and alerting thresholds.',
  'Traffic Mgmt': 'Test failover with health checks.',
  'Event-Driven': 'Consider DLQs and idempotency.',
  'Persistence': 'Think about read/write split.',
  'Realtime': 'Evaluate backpressure strategies.',
};

export const LearningBreadcrumbs: React.FC<LearningBreadcrumbsProps> = ({ design }) => {
  const learned = Array.from(new Set(
    design.components.map(c => conceptMap[c.type]).filter(Boolean)
  ));
  if (learned.length === 0) return null;

  const suggestion = nextUp[learned[0]] || 'Explore scalability and resilience next.';

  return (
    <div className="px-2 py-1 text-xs bg-card/40 border border-border/30 rounded-md flex items-center gap-2">
      <span className="text-muted-foreground">Concepts practiced:</span>
      {learned.map(c => (
        <span key={c} className="px-1.5 py-0.5 rounded bg-accent/30 text-[11px]">{c}</span>
      ))}
      <span className="ml-2 text-muted-foreground">Next: {suggestion}</span>
    </div>
  );
};

export default LearningBreadcrumbs;

