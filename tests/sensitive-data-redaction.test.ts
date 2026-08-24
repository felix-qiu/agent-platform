import { describe, expect, it } from "vitest";
import type { DestinationStream } from "pino";
import { createLogger } from "../src/observability/logger.js";

describe("sensitive data redaction", () => {
  it("redacts API keys and authorization values from structured logs", () => {
    let output = "";
    const destination: DestinationStream = {
      write(message) {
        output += message;
        return true;
      },
    };
    const secret = "ragflow-super-secret";
    const testLogger = createLogger("info", destination);

    testLogger.info(
      {
        apiKey: secret,
        request: { authorization: `Bearer ${secret}` },
      },
      "redaction test",
    );

    expect(output).not.toContain(secret);
    expect(output).toContain("[REDACTED]");
  });
});
