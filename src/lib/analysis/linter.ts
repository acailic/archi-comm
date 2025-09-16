// src/lib/analysis/linter.ts
// Basic anti-pattern detection and fix suggestions

import type { DesignData } from '@/shared/contracts';

export interface LintIssue {
  id: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  fixHint?: string;
}

export function lintDesign(design: DesignData): LintIssue[] {
  const issues: LintIssue[] = [];
  const types = design.components.map(c => c.type);
  const byType = (t: string) => design.components.filter(c => c.type === t);
  const has = (t: string) => types.includes(t);

  // Single DB bottleneck: many microservices, exactly one DB
  const microservices = byType('microservice').length;
  const dbs = byType('database').length + byType('postgresql').length + byType('mysql').length + byType('mongodb').length + byType('dynamodb').length;
  if (microservices >= 5 && dbs === 1) {
    issues.push({
      id: 'hot-shard-db',
      title: 'Single database bottleneck',
      description: 'Multiple services share a single database; hot shards and contention likely.',
      severity: 'warning',
      fixHint: 'Introduce read replicas, caching, or split by bounded contexts.',
    });
  }

  // No load balancer in front of multiple servers
  const servers = byType('server').length;
  if (servers >= 2 && !has('load-balancer')) {
    issues.push({
      id: 'no-lb',
      title: 'No load balancer for multiple servers',
      description: 'Traffic cannot be evenly distributed across server instances.',
      severity: 'error',
      fixHint: 'Add a load balancer and route client/API traffic through it.',
    });
  }

  // No cache: DB present without cache
  if (dbs >= 1 && !has('cache') && !has('redis')) {
    issues.push({
      id: 'no-cache',
      title: 'No cache in front of database',
      description: 'Reads may be hitting the database directly, increasing latency and cost.',
      severity: 'warning',
      fixHint: 'Introduce a cache (e.g., Redis) for hot paths.',
    });
  }

  // Chatty microservice: node with very high degree
  const degree: Record<string, number> = {};
  for (const c of design.connections) {
    degree[c.from] = (degree[c.from] || 0) + 1;
    degree[c.to] = (degree[c.to] || 0) + 1;
  }
  const chatty = Object.entries(degree)
    .filter(([id, deg]) => deg >= 8 && design.components.find(c => c.id === id)?.type === 'microservice');
  if (chatty.length > 0) {
    issues.push({
      id: 'chatty-ms',
      title: 'Chatty microservice(s)',
      description: 'Some services have high coupling; consider aggregation or asynchronous messaging.',
      severity: 'info',
      fixHint: 'Introduce queues or data aggregation to reduce synchronous calls.',
    });
  }

  // Observability gap
  if (!has('monitoring') || !has('logging') || !has('metrics')) {
    issues.push({
      id: 'observability-gap',
      title: 'Missing observability components',
      description: 'Monitoring, logging, and metrics improve MTTR and resilience.',
      severity: 'info',
      fixHint: 'Add Monitoring, Logging, and Metrics to the design.',
    });
  }

  return issues;
}

