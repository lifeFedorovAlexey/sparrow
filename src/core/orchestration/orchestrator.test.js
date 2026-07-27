import test from "node:test";
import assert from "node:assert/strict";
import { HermesParserOrchestrator } from "./orchestrator.js";
import { InMemoryRunLog } from "../observability/in-memory-run-log.js";

function agent(name, result) {
  return { name, execute: async () => result };
}

test("orchestrator coordinates the planning agents and records audit events", async () => {
  const calls = [];
  const planner = { name: "task-planner", execute: async (input) => (calls.push(["planner", input]), { url: "https://example.com" }) };
  const analyzer = { name: "site-analyzer", execute: async (input) => (calls.push(["analyzer", input]), { apis: [{ kind: "rest" }] }) };
  const selector = { name: "strategy-selector", execute: async (input) => (calls.push(["selector", input]), { kind: "rest" }) };
  const log = new InMemoryRunLog();
  const orchestrator = new HermesParserOrchestrator({ planner, analyzer, selector, log });

  const result = await orchestrator.run({ description: "Parse https://example.com" });

  assert.equal(result.strategy.kind, "rest");
  assert.deepEqual(calls.map(([name]) => name), ["planner", "analyzer", "selector"]);
  assert.equal(log.events.length, 6);
});

test("orchestrator completes mapping, generation, and validation when configured", async () => {
  const orchestrator = new HermesParserOrchestrator({
    planner: agent("task-planner", { url: "https://example.com/products", fields: ["title", "price"], output: { kind: "json" } }),
    analyzer: agent("site-analyzer", { html: "<article></article>", apis: [], htmlAvailable: true }),
    selector: agent("strategy-selector", { kind: "html" }),
    domAnalyzer: agent("dom-analyzer", { primaryContainer: { selector: ".product", count: 2, fields: [] } }),
    fieldMapper: agent("field-mapper", { mappings: [
      { field: "title", selector: ".title", attribute: "text" },
      { field: "price", selector: ".price", attribute: "text" },
    ], unmapped: [] }),
    generator: agent("project-generator", { projectId: "example-com", projectPath: "projects/example-com", files: [] }),
    validator: agent("validator", { valid: true, itemCount: 2, errors: [] }),
    log: new InMemoryRunLog(),
    idFactory: () => "run-1",
  });

  const result = await orchestrator.run({ description: "parse" });

  assert.equal(result.project.projectId, "example-com");
  assert.equal(result.validation.valid, true);
  assert.equal(result.events.length, 14);
});
