// src/lib/analysis/rubric.ts
// Lightweight rubric scoring heuristics for designs

import type { DesignData } from '@/shared/contracts';

export type RubricAxis = 'functional' | 'scalability' | 'resilience' | 'cost' | 'complexity';

export interface RubricScore {
  axis: RubricAxis;
  score: number; // 0-100
  tips: string[];
}

export interface RubricResult {
  scores: RubricScore[];
  overall: number; // average
  achievements: string[];
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

export function evaluateRubric(design: DesignData): RubricResult {
  const types = design.components.map(c => c.type);
  const countBy = (t: string) => types.filter(x => x === t).length;
  const has = (t: string) => types.includes(t);
  const total = types.length;

  // Functional fit: APIs with clients, storage present when services exist, etc.
  let functional = 30;
  const hasClients = ['client', 'web-app', 'mobile-app', 'desktop-app', 'iot-device'].some(has);
  if (hasClients && has('api-gateway')) functional += 25; else if (hasClients) functional += 10;
  if (['database', 'postgresql', 'mysql', 'mongodb', 'dynamodb'].some(has)) functional += 15;
  if (['cache', 'redis'].some(has)) functional += 10;
  if (total >= 6) functional += 10;
  if (has('websocket') || has('rest-api') || has('graphql')) functional += 10;

  // Scalability: load balancer, cache, message-queue, multiple instances
  let scalability = 20;
  if (has('load-balancer')) scalability += 25;
  if (['cache', 'redis'].some(has)) scalability += 15;
  if (['message-queue'].some(has)) scalability += 15;
  const servers = countBy('server');
  if (servers >= 2) scalability += 10;
  if (types.filter(t => t === 'microservice').length >= 4) scalability += 10;

  // Resilience: observability, queues, dlq
  let resilience = 20;
  if (has('monitoring')) resilience += 15;
  if (has('logging')) resilience += 10;
  if (has('metrics')) resilience += 10;
  if (has('message-queue')) resilience += 15;
  if (has('dead-letter-queue')) resilience += 15;
  if (has('load-balancer') && servers >= 2) resilience += 10;

  // Cost (inverted): fewer heavy components, use serverless/cache
  // Higher score means more cost‑efficient
  const heavy = ['database', 'postgresql', 'mysql', 'mongodb'].
    reduce((acc, t) => acc + countBy(t), 0);
  const ml = countBy('ai-ml');
  const serverless = countBy('lambda') + countBy('cloud-function');
  let cost = 70 - heavy * 6 - ml * 8 - Math.max(0, total - 15) * 2 + serverless * 4 + (has('cache') ? 6 : 0);
  cost = clamp(cost);

  // Complexity: more services == more complexity (inverse of score)
  const ms = countBy('microservice');
  let complexity = 100 - (ms * 4 + Math.max(0, total - 12) * 2);
  complexity = clamp(complexity);

  // Tips per axis
  const tips: Record<RubricAxis, string[]> = {
    functional: [
      ...(hasClients && !has('api-gateway') ? ['Add an API Gateway to consolidate client ingress.'] : []),
      ...(!['database', 'postgresql', 'mysql', 'mongodb', 'dynamodb'].some(has) ? ['Add a persistent data store.'] : []),
    ],
    scalability: [
      ...(!has('load-balancer') && servers >= 2 ? ['Front multiple servers with a load balancer.'] : []),
      ...(!has('cache') ? ['Introduce a cache to reduce DB load.'] : []),
      ...(!has('message-queue') && ms >= 4 ? ['Use a message queue to decouple services.'] : []),
    ],
    resilience: [
      ...(!has('monitoring') ? ['Add monitoring to gain visibility and alarms.'] : []),
      ...(!has('dead-letter-queue') && has('message-queue') ? ['Configured DLQ for failed messages.'] : []),
    ],
    cost: [
      ...(heavy >= 2 && !has('cache') ? ['Cache hot reads to reduce expensive DB hits.'] : []),
      ...(serverless === 0 && total < 10 ? ['Consider serverless for sporadic workloads.'] : []),
    ],
    complexity: [
      ...(ms >= 8 ? ['Group or simplify services; avoid premature decomposition.'] : []),
    ],
  };

  const scores: RubricScore[] = [
    { axis: 'functional', score: clamp(functional), tips: tips.functional },
    { axis: 'scalability', score: clamp(scalability), tips: tips.scalability },
    { axis: 'resilience', score: clamp(resilience), tips: tips.resilience },
    { axis: 'cost', score: clamp(cost), tips: tips.cost },
    { axis: 'complexity', score: clamp(complexity), tips: tips.complexity },
  ];

  const overall = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);

  const achievements: string[] = [];
  if (scores.find(s => s.axis === 'resilience')!.score >= 95) achievements.push('Resilience Star');
  if (scores.find(s => s.axis === 'cost')!.score >= 85) achievements.push('Budget Ninja');
  if (scores.find(s => s.axis === 'scalability')!.score >= 90) achievements.push('Scale Architect');

  return { scores, overall, achievements };
}

export function summarizeImprovements(before: RubricResult, after: RubricResult): string[] {
  const out: string[] = [];
  for (const axis of ['functional', 'scalability', 'resilience', 'cost', 'complexity'] as RubricAxis[]) {
    const b = before.scores.find(s => s.axis === axis)!.score;
    const a = after.scores.find(s => s.axis === axis)!.score;
    const d = a - b;
    if (d > 0) out.push(`${axis}: +${d}`);
  }
  const dOverall = after.overall - before.overall;
  if (dOverall !== 0) out.push(`overall: ${dOverall > 0 ? '+' : ''}${dOverall}`);
  return out;
}

