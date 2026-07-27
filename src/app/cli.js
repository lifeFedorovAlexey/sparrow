#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { TaskPlanner } from "../modules/task-planning/task-planner.agent.js";
import { SiteAnalyzer } from "../modules/site-analysis/site-analyzer.agent.js";
import { StrategySelector } from "../modules/strategy-selection/strategy-selector.agent.js";
import { HttpSiteProbe } from "../infrastructure/site-probes/http-site-probe.js";
import { HermesParserOrchestrator } from "../core/orchestration/orchestrator.js";
import { InMemoryRunLog } from "../core/observability/in-memory-run-log.js";
import { resolveTaskDescription } from "./task-description.input.js";
import { resolve } from "node:path";
import { DomAnalyzer } from "../modules/dom-analysis/dom-analyzer.agent.js";
import { FieldMapper } from "../modules/field-mapping/field-mapper.agent.js";
import { ProjectGenerator } from "../modules/project-generation/project-generator.agent.js";
import { Validator } from "../modules/validation/validator.agent.js";
import { runNodeProject } from "../infrastructure/execution/node-project.runner.js";
import { presentRunResult } from "./run-result.presenter.js";

const prompt = createInterface({ input: process.stdin, output: process.stdout });

try {
  const description = await resolveTaskDescription({
    args: process.argv.slice(2),
    ask: (question) => prompt.question(question),
  });
  const probe = new HttpSiteProbe();
  const orchestrator = new HermesParserOrchestrator({
    planner: new TaskPlanner(),
    analyzer: new SiteAnalyzer({ probe: (url) => probe.inspect(url) }),
    selector: new StrategySelector(),
    domAnalyzer: new DomAnalyzer(),
    fieldMapper: new FieldMapper(),
    generator: new ProjectGenerator({ projectsRoot: resolve("projects") }),
    validator: new Validator({ runner: runNodeProject }),
    log: new InMemoryRunLog(),
  });

  const result = await orchestrator.run({ description });
  console.log(presentRunResult(result));
  if (!result.validation.valid) process.exitCode = 1;
} catch (error) {
  console.error(`Ошибка: ${error.message}`);
  process.exitCode = 1;
} finally {
  prompt.close();
}
