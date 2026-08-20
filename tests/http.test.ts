import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/api/server.js";
import { FakeRuntime } from "../src/runtime/fake-runtime.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("HTTP API", () => {
  it("reports health and creates a conversation", async () => {
    app = await createApp({ runtime: new FakeRuntime() });
    const health = await app.inject({ method: "GET", url: "/health" });
    const created = await app.inject({
      method: "POST",
      url: "/v1/conversations",
    });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: "ok" });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ status: "active" });
  });

  it("streams public SSE events through a complete tool-call flow", async () => {
    app = await createApp({ runtime: new FakeRuntime() });
    const created = await app.inject({
      method: "POST",
      url: "/v1/conversations",
    });
    const id = created.json<{ id: string }>().id;
    const response = await app.inject({
      method: "POST",
      url: `/v1/conversations/${id}/messages`,
      payload: { message: "我的订单发货了吗？" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.body).toContain("event: tool.started");
    expect(response.body).toContain("event: tool.completed");
    expect(response.body).toContain("event: message.delta");
    expect(response.body).toContain("event: message.completed");
    expect(response.body).toContain("event: run.completed");
    expect(response.body).not.toContain("systemPrompt");
  });
});
