#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { TaskPlanner } from "../modules/task-planning/task-planner.agent.js";
import { SiteAnalyzer } from "../modules/site-analysis/site-analyzer.agent.js";
import { StrategySelector } from "../modules/strategy-selection/strategy-selector.agent.js";
import { HttpSiteProbe } from "../infrastructure/site-probes/http-site-probe.js";
import { HermesParserOrchestrator } from "../core/orchestration/orchestrator.js";
import { InMemoryRunLog } from "../core/observability/in-memory-run-log.js";
import { resolveTaskDescription } from "./task-description.input.js";

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
    log: new InMemoryRunLog(),
  });

  const result = await orchestrator.run({ description });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: error.message }, null, 2));
  process.exitCode = 1;
} finally {
  prompt.close();
}
