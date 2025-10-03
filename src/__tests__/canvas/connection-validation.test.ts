import { describe, expect, it, test } from "vitest";
import {
  getConnectionSuggestions,
  getConnectionValidationMessage,
  isDuplicateConnection,
  isSelfConnection,
  validateCircularDependency,
  validateConnection,
  validateConnectionByType,
  validateConnectionComprehensive,
  validateConnectionCount,
  validateConnectionDirection,
  validateDuplicateConnection,
  type ConnectionValidationResult,
} from "../../packages/canvas/utils/connection-validation";
import type { DesignComponent } from "../../shared/contracts";
import { createTestComponent, createTestConnection } from "./test-helpers";

describe("Connection Validation Utilities", () => {
  const baseComponents = (): DesignComponent[] => [
    createTestComponent("client-1", "client"),
    createTestComponent("api-1", "api-gateway"),
    createTestComponent("db-1", "database"),
    createTestComponent("cache-1", "cache"),
    createTestComponent("service-1", "microservice"),
  ];

  describe("Basic Guards", () => {
    it("should detect self connections", () => {
      expect(isSelfConnection("comp-1", "comp-1")).toBe(true);
      expect(isSelfConnection("comp-1", "comp-2")).toBe(false);
    });

    it("should detect duplicate connections", () => {
      const connections = [createTestConnection("conn-1", "comp-1", "comp-2")];

      expect(isDuplicateConnection("comp-1", "comp-2", connections)).toBe(true);
      expect(isDuplicateConnection("comp-2", "comp-1", connections)).toBe(true);
      expect(isDuplicateConnection("comp-1", "comp-3", connections)).toBe(
        false
      );
    });
  });

  describe("validateConnection", () => {
    it("should allow new valid connections", () => {
      const components = baseComponents();
      const result = validateConnection("client-1", "api-1", [], components);
      expect(result.valid).toBe(true);
    });

    it("should reject self connections", () => {
      const components = baseComponents();
      const result = validateConnection("client-1", "client-1", [], components);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Cannot connect component to itself");
      expect(result.severity).toBe("error");
    });

    it("should reject duplicate connections", () => {
      const components = baseComponents();
      const connections = [createTestConnection("conn-1", "client-1", "api-1")];
      const result = validateConnection(
        "client-1",
        "api-1",
        connections,
        components
      );

      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Connection already exists");
    });

    it("should return error when components missing", () => {
      const components = [createTestComponent("api-1", "api-gateway")];
      const sourceMissing = validateConnection(
        "missing",
        "api-1",
        [],
        components
      );
      const targetMissing = validateConnection(
        "api-1",
        "missing",
        [],
        components
      );

      expect(sourceMissing.reason).toBe("Source component not found");
      expect(targetMissing.reason).toBe("Target component not found");
    });
  });

  describe("Architecture Rules", () => {
    const cases = [
      {
        source: "client",
        target: "database",
        valid: false,
        reason: "Clients should connect through an API Gateway",
        severity: "warning",
      },
      {
        source: "client",
        target: "api-gateway",
        valid: true,
      },
      {
        source: "database",
        target: "server",
        valid: false,
        reason: "Databases should receive connections",
        severity: "warning",
      },
      {
        source: "server",
        target: "database",
        valid: true,
      },
      {
        source: "load-balancer",
        target: "database",
        valid: false,
        reason: "Load balancers typically distribute to services",
        severity: "warning",
      },
    ];

    test.each(cases)(
      "should validate $source -> $target",
      ({ source, target, valid, reason, severity }) => {
        const result = validateConnectionByType(source, target);
        expect(result.valid).toBe(valid);
        if (!valid && reason) {
          expect(result.reason).toContain(reason);
          expect(result.severity).toBe(severity);
        }
      }
    );
  });

  describe("Direction Rules", () => {
    const cases: Array<{
      source: string;
      target: string;
      type: string;
      valid: boolean;
      severity?: "error" | "warning";
    }> = [
      {
        source: "database",
        target: "server",
        type: "data",
        valid: false,
        severity: "error",
      },
      {
        source: "cache",
        target: "server",
        type: "data",
        valid: false,
        severity: "warning",
      },
      { source: "cache", target: "server", type: "async", valid: true },
      { source: "server", target: "database", type: "data", valid: true },
    ];

    test.each(cases)(
      "should validate $source -> $target ($type)",
      ({ source, target, type, valid, severity }) => {
        const result = validateConnectionDirection(source, target, type);
        expect(result.valid).toBe(valid);
        if (!valid) {
          expect(result.severity).toBe(severity);
        }
      }
    );
  });

  describe("Duplicate Validation", () => {
    it("should detect duplicate connections across store", () => {
      const connections = [
        createTestConnection("conn-1", "client-1", "api-1"),
        createTestConnection("conn-2", "api-1", "db-1"),
      ];
      const result = validateDuplicateConnection(
        "client-1",
        "api-1",
        "data",
        connections
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBe(
        "Connection of this type already exists. Edit the existing connection instead."
      );
    });
  });

  describe("Circular Dependency", () => {
    it("should flag circular dependencies", () => {
      const connections = [
        createTestConnection("conn-1", "service-1", "db-1"),
        createTestConnection("conn-2", "db-1", "service-1"),
      ];
      const result = validateCircularDependency(
        "service-1",
        "db-1",
        connections
      );
      expect(result.valid).toBe(false);
      expect(result.severity).toBe("error");
    });

    it("should allow acyclic connections", () => {
      const connections = [createTestConnection("conn-1", "service-1", "db-1")];
      const result = validateCircularDependency(
        "service-1",
        "cache-1",
        connections
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("Connection Count Limits", () => {
    const cases = [
      { type: "load-balancer", limit: 100, count: 99, valid: true },
      { type: "load-balancer", limit: 100, count: 120, valid: false },
      { type: "microservice", limit: 20, count: 19, valid: true },
      { type: "microservice", limit: 20, count: 25, valid: false },
    ];

    test.each(cases)(
      "should enforce limit for $type",
      ({ type, count, valid }) => {
        const connections = Array.from({ length: count }, (_, index) =>
          createTestConnection(`conn-${index}`, "service-1", `target-${index}`)
        );
        const result = validateConnectionCount("service-1", type, connections);
        expect(result.valid).toBe(valid);
      }
    );
  });

  describe("Comprehensive Validation", () => {
    it("should aggregate validation checks", () => {
      const components = baseComponents();
      const connections = [createTestConnection("conn-1", "client-1", "api-1")];

      const result = validateConnectionComprehensive(
        "client-1",
        "api-1",
        "data",
        connections,
        components
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Connection already exists");
    });

    it("should return valid when all checks pass", () => {
      const components = baseComponents();
      const connections = [createTestConnection("conn-1", "api-1", "db-1")];

      const result = validateConnectionComprehensive(
        "client-1",
        "api-1",
        "data",
        connections,
        components
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("Connection Suggestions", () => {
    const cases = [
      {
        sourceType: "client",
        available: ["api-gateway", "server", "database"],
        expected: ["component-1"],
      },
      {
        sourceType: "api-gateway",
        available: ["microservice", "cache", "database"],
        expected: ["component-1", "component-2"],
      },
      {
        sourceType: "unknown",
        available: ["database"],
        expected: [],
      },
    ];

    test.each(cases)(
      "should suggest connections for $sourceType",
      ({ sourceType, available, expected }) => {
        const components = available.map((type, index) =>
          createTestComponent(`component-${index + 1}`, type)
        );
        const suggestions = getConnectionSuggestions(sourceType, components);
        expect(suggestions).toEqual(expected);
      }
    );
  });

  describe("Validation Messages", () => {
    const expectMessage = (
      result: ConnectionValidationResult,
      expected: string
    ) => {
      expect(getConnectionValidationMessage(result)).toBe(expected);
    };

    it("should format success messages", () => {
      expectMessage({ valid: true }, "Connection is valid");
    });

    it("should include severity in warnings", () => {
      expectMessage(
        { valid: false, reason: "Test warning", severity: "warning" },
        "Warning: Test warning"
      );
    });

    it("should default to generic message when no reason provided", () => {
      expectMessage({ valid: false }, "Error: Invalid connection");
    });
  });
});
