import { z } from 'zod';

export const Position = z.object({ x: z.number(), y: z.number() });
// DiagramElement schema for persistence
// Layer information is stored in the properties field as 'layerId' for backward compatibility
// with existing Tauri backend implementations. This approach ensures existing schemas
// continue to work without modification while supporting the new layer functionality.
//
// Example properties object with layer information:
// {
//   "label": "API Server",
//   "description": "Main API endpoint",
//   "layerId": "layer-backend-services"
// }
export const DiagramElementSchema = z.object({
  id: z.string(),
  element_type: z.string(),
  position: Position,
  properties: z.record(z.string()).default({}), // layerId stored here for backward compatibility
});

export const ConnectionSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  target_id: z.string(),
  connection_type: z.string(),
  properties: z.record(z.string()).default({}),
});

export const ComponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  component_type: z.enum(['Frontend', 'Backend', 'Database', 'Api', 'Service', 'Integration']),
  description: z.string(),
  dependencies: z.array(z.string()),
  status: z.enum(['NotStarted', 'InProgress', 'Testing', 'Done']),
  metadata: z.record(z.string()).default({}),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  status: z.enum(['Planning', 'InProgress', 'Review', 'Complete']),
  components: z.array(ComponentSchema),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Component = z.infer<typeof ComponentSchema>;
export type DiagramElement = z.infer<typeof DiagramElementSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;

// Runtime schema exports to match consumer imports
export const Project = ProjectSchema;

export const ReviewRespSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  score: z.number().int().min(0).max(100).default(0),
});
export type ReviewResp = z.infer<typeof ReviewRespSchema>;
export const ReviewResp = ReviewRespSchema;
