import { z } from 'zod';

export const Position = z.object({ x: z.number(), y: z.number() });
export const DiagramElement = z.object({
  id: z.string(),
  element_type: z.string(),
  position: Position,
  properties: z.record(z.string()).default({}),
});

export const Connection = z.object({
  id: z.string(),
  source_id: z.string(),
  target_id: z.string(),
  connection_type: z.string(),
  properties: z.record(z.string()).default({}),
});

export const Component = z.object({
  id: z.string(),
  name: z.string(),
  component_type: z.enum(['Frontend','Backend','Database','Api','Service','Integration']),
  description: z.string(),
  dependencies: z.array(z.string()),
  status: z.enum(['NotStarted','InProgress','Testing','Done']),
  metadata: z.record(z.string()).default({}),
});

export const Project = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  status: z.enum(['Planning','InProgress','Review','Complete']),
  components: z.array(Component),
});

export type Project = z.infer<typeof Project>;
export type Component = z.infer<typeof Component>;
export type DiagramElement = z.infer<typeof DiagramElement>;
export type Connection = z.infer<typeof Connection>;

export const ReviewResp = z.object({
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  score: z.number().int().min(0).max(100).default(0),
});
export type ReviewResp = z.infer<typeof ReviewResp>;

