import test from "node:test";
import assert from "node:assert/strict";
import { HermesParserOrchestrator } from "./orchestrator.js";
import { InMemoryRunLog } from "../observability/in-memory-run-log.js";

test("orchestrator coordinates independent agents and records audit events", async () => {
  const calls = [];
  const planner = { name: "task-planner", execute: async (input) => (calls.push(["planner", input]), { url: "https://example.com" }) };
  const analyzer = { name: "site-analyzer", execute: async (input) => (calls.push(["analyzer", input]), { apis: [{ kind: "rest" }] }) };
  const selector = { name: "strategy-selector", execute: async (input) => (calls.push(["selector", input]), { kind: "rest" }) };
  const log = new InMemoryRunLog();
  const orchestrator = new HermesParserOrchestrator({ planner, analyzer, selector, log });

  const result = await orchestrator.run({ description: "Parse https://example.com" });

  assert.equal(result.strategy.kind, "rest");
  assert.deepEqual(calls.map(([name]) => name), ["planner", "analyzer", "selector"]);
  assert.deepEqual(log.events.map((event) => `${event.agent}:${event.status}`), [
    "task-planner:started",
    "task-planner:succeeded",
    "site-analyzer:started",
    "site-analyzer:succeeded",
    "strategy-selector:started",
    "strategy-selector:succeeded",
  ]);
});
