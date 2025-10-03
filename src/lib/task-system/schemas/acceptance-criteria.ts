// src/lib/task-system/schemas/acceptance-criteria.ts
// Zod schemas for acceptance criteria validation
// Supports BDD/Gherkin scenarios and test traceability
// RELEVANT FILES: src/lib/task-system/TaskPlugin.ts, src/lib/task-system/schemas/task-schema.ts

import { z } from "zod";

/**
 * Gherkin scenario schema for BDD-style acceptance criteria
 */
export const GherkinScenarioSchema = z.object({
  feature: z.string().min(1, "Feature name is required"),
  scenario: z.string().min(1, "Scenario name is required"),
  given: z.array(z.string()).min(1, "At least one Given step is required"),
  when: z.array(z.string()).min(1, "At least one When step is required"),
  then: z.array(z.string()).min(1, "At least one Then step is required"),
  examples: z
    .array(
      z.object({
        description: z.string().optional(),
        data: z.record(z.string(), z.any()),
      }),
    )
    .optional(),
});

export type GherkinScenario = z.infer<typeof GherkinScenarioSchema>;

/**
 * Acceptance criterion type enum
 */
export const AcceptanceCriterionTypeSchema = z.enum([
  "functional",
  "non-functional",
  "technical",
  "user-experience",
]);

export type AcceptanceCriterionType = z.infer<
  typeof AcceptanceCriterionTypeSchema
>;

/**
 * Acceptance criterion priority enum
 */
export const AcceptanceCriterionPrioritySchema = z.enum([
  "must-have",
  "should-have",
  "nice-to-have",
]);

export type AcceptanceCriterionPriority = z.infer<
  typeof AcceptanceCriterionPrioritySchema
>;

/**
 * Acceptance criterion status enum
 */
export const AcceptanceCriterionStatusSchema = z.enum([
  "pending",
  "in-progress",
  "implemented",
  "verified",
]);

export type AcceptanceCriterionStatus = z.infer<
  typeof AcceptanceCriterionStatusSchema
>;

/**
 * Individual acceptance criterion schema
 */
export const AcceptanceCriterionSchema = z.object({
  id: z.string().min(1, "Criterion ID is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: AcceptanceCriterionTypeSchema,
  priority: AcceptanceCriterionPrioritySchema,
  gherkin: GherkinScenarioSchema.optional(),
  testIds: z.array(z.string()).default([]),
  status: AcceptanceCriterionStatusSchema.default("pending"),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

/**
 * Array of acceptance criteria
 */
export const AcceptanceCriteriaArraySchema = z
  .array(AcceptanceCriterionSchema)
  .min(1, "At least one acceptance criterion is required");

/**
 * Validation helper functions
 */
export const validateAcceptanceCriterion = (criterion: unknown) => {
  return AcceptanceCriterionSchema.parse(criterion);
};

export const validateAcceptanceCriteria = (criteria: unknown) => {
  return AcceptanceCriteriaArraySchema.parse(criteria);
};

export const validateGherkinScenario = (scenario: unknown) => {
  return GherkinScenarioSchema.parse(scenario);
};

/**
 * Status transition validation
 */
const validStatusTransitions: Record<
  AcceptanceCriterionStatus,
  AcceptanceCriterionStatus[]
> = {
  pending: ["in-progress"],
  "in-progress": ["implemented", "pending"],
  implemented: ["verified", "in-progress"],
  verified: ["implemented"],
};

export const isValidStatusTransition = (
  currentStatus: AcceptanceCriterionStatus,
  newStatus: AcceptanceCriterionStatus,
): boolean => {
  return validStatusTransitions[currentStatus]?.includes(newStatus) ?? false;
};

/**
 * Helper to generate criterion ID
 */
export const generateCriterionId = (taskId: string, index: number): string => {
  return `${taskId}-ac-${String(index).padStart(3, "0")}`;
};
