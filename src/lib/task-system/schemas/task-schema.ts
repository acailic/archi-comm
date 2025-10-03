// src/lib/task-system/schemas/task-schema.ts
// Extended task schema with acceptance criteria support
// Builds upon existing task structure with test coverage and documentation
// RELEVANT FILES: src/lib/task-system/TaskPlugin.ts, src/lib/task-system/schemas/acceptance-criteria.ts

import { z } from "zod";

import { AcceptanceCriterionSchema } from "./acceptance-criteria";

/**
 * Test coverage configuration schema
 */
export const TestCoverageSchema = z.object({
  required: z.number().min(0).max(100).default(80),
  unit: z.array(z.string()).default([]),
  integration: z.array(z.string()).default([]),
  e2e: z.array(z.string()).default([]),
});

export type TestCoverage = z.infer<typeof TestCoverageSchema>;

/**
 * Documentation references schema
 */
export const DocumentationSchema = z.object({
  adr: z.array(z.string()).default([]),
  api: z.array(z.string()).default([]),
  guides: z.array(z.string()).default([]),
});

export type Documentation = z.infer<typeof DocumentationSchema>;

/**
 * Extended task schema with acceptance criteria
 * This extends the existing task.json structure
 */
export const TaskSchema = z.object({
  // Existing task fields
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  category: z.string().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  estimatedTime: z.string().optional(),
  tags: z.array(z.string()).default([]),

  // New fields for acceptance criteria
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).optional().default([]),
  testCoverage: TestCoverageSchema.optional(),
  documentation: DocumentationSchema.optional(),

  // Additional metadata
  version: z.string().default("1.0.0"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * Validation helper functions
 */
export const validateTask = (task: unknown): Task => {
  return TaskSchema.parse(task);
};

/**
 * Check if all acceptance criteria have linked tests
 */
export const validateAcceptanceCriteriaCoverage = (
  task: Task,
): {
  isValid: boolean;
  uncoveredCriteria: string[];
} => {
  if (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) {
    return { isValid: true, uncoveredCriteria: [] };
  }

  const uncoveredCriteria = task.acceptanceCriteria
    .filter((criterion) => criterion.testIds.length === 0)
    .map((criterion) => criterion.id);

  return {
    isValid: uncoveredCriteria.length === 0,
    uncoveredCriteria,
  };
};

/**
 * Check if must-have criteria have tests
 */
export const validateMustHaveCriteria = (
  task: Task,
): {
  isValid: boolean;
  missingTests: string[];
} => {
  if (!task.acceptanceCriteria) {
    return { isValid: true, missingTests: [] };
  }

  const mustHaveCriteria = task.acceptanceCriteria.filter(
    (criterion) => criterion.priority === "must-have",
  );

  const missingTests = mustHaveCriteria
    .filter((criterion) => criterion.testIds.length === 0)
    .map((criterion) => criterion.id);

  return {
    isValid: missingTests.length === 0,
    missingTests,
  };
};

/**
 * Calculate overall task progress based on acceptance criteria status
 */
export const calculateTaskProgress = (task: Task): number => {
  if (!task.acceptanceCriteria || task.acceptanceCriteria.length === 0) {
    return 0;
  }

  const verifiedCount = task.acceptanceCriteria.filter(
    (criterion) => criterion.status === "verified",
  ).length;

  return Math.round((verifiedCount / task.acceptanceCriteria.length) * 100);
};
