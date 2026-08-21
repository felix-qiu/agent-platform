import { describe, expect, it } from "vitest";
import { createCustomerServiceAgent } from "../src/agents/customer-service/index.js";

describe("versioned definitions", () => {
  it("identifies the Customer Service Agent and its governance metadata", () => {
    const agent = createCustomerServiceAgent();

    expect(`${agent.id}@${agent.version}`).toBe("customer-service@2.0.0");
    expect(agent.permissions).toContain("order:read");
    expect(agent.policies).toContain("ground-business-facts-in-tools");
    expect(agent.policies).toContain("prefer-knowledge-over-model-memory");
    expect(agent.tools.map(({ name }) => name)).toContain("search_knowledge");
    expect(agent.tools.every(({ version }) => version === "1.0.0")).toBe(true);
    expect(agent.tools.every(({ permissions }) => permissions.length > 0)).toBe(
      true,
    );
  });
});
