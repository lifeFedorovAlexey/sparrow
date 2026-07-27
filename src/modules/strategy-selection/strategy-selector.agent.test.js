import test from "node:test";
import assert from "node:assert/strict";
import { StrategySelector } from "./strategy-selector.agent.js";

test("StrategySelector chooses REST before browser rendering", async () => {
  const selector = new StrategySelector();
  const result = await selector.execute({
    site: {
      apis: [{ kind: "graphql" }, { kind: "rest", url: "https://example.com/api" }],
      htmlAvailable: true,
      javascriptRequired: true,
    },
  });

  assert.equal(result.kind, "rest");
  assert.match(result.reason, /priority/i);
});

test("StrategySelector falls back to Playwright for JavaScript-only pages", async () => {
  const selector = new StrategySelector();
  const result = await selector.execute({
    site: { apis: [], htmlAvailable: false, javascriptRequired: true },
  });

  assert.equal(result.kind, "playwright");
});
