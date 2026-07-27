import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TaskPlanner } from "../modules/task-planning/task-planner.agent.js";
import { SiteAnalyzer } from "../modules/site-analysis/site-analyzer.agent.js";
import { StrategySelector } from "../modules/strategy-selection/strategy-selector.agent.js";
import { DomAnalyzer } from "../modules/dom-analysis/dom-analyzer.agent.js";
import { FieldMapper } from "../modules/field-mapping/field-mapper.agent.js";
import { ProjectGenerator } from "../modules/project-generation/project-generator.agent.js";
import { Validator } from "../modules/validation/validator.agent.js";
import { HttpSiteProbe } from "../infrastructure/site-probes/http-site-probe.js";
import { runNodeProject } from "../infrastructure/execution/node-project.runner.js";
import { HermesParserOrchestrator } from "../core/orchestration/orchestrator.js";
import { InMemoryRunLog } from "../core/observability/in-memory-run-log.js";

const catalog = `<main>
  <article class="product-card"><h2 class="title">Alpha</h2><span class="price">100 ₽</span></article>
  <article class="product-card"><h2 class="title">Beta</h2><span class="price">200 ₽</span></article>
</main>`;

test("generates and validates a working parser from a natural-language task", async (context) => {
  const server = createServer((request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(request.url === "/robots.txt" ? "User-agent: *" : catalog);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const { port } = server.address();
  const projectsRoot = await mkdtemp(join(tmpdir(), "hermes-e2e-"));
  const probe = new HttpSiteProbe();
  const orchestrator = new HermesParserOrchestrator({
    planner: new TaskPlanner(),
    analyzer: new SiteAnalyzer({ probe: (url) => probe.inspect(url) }),
    selector: new StrategySelector(),
    domAnalyzer: new DomAnalyzer(),
    fieldMapper: new FieldMapper(),
    generator: new ProjectGenerator({ projectsRoot }),
    validator: new Validator({ runner: runNodeProject }),
    log: new InMemoryRunLog(),
  });

  const result = await orchestrator.run({
    description: `Собирай название и цены с http://127.0.0.1:${port}/ в JSON`,
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.validation.itemCount, 2);
  assert.equal(result.project.files.includes("src/parser.js"), true);
});
