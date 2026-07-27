#!/usr/bin/env node
import { TaskPlanner } from "../modules/task-planning/task-planner.agent.js";
import { SiteAnalyzer } from "../modules/site-analysis/site-analyzer.agent.js";
import { StrategySelector } from "../modules/strategy-selection/strategy-selector.agent.js";
import { HttpSiteProbe } from "../infrastructure/site-probes/http-site-probe.js";
import { HermesParserOrchestrator } from "../core/orchestration/orchestrator.js";
import { InMemoryRunLog } from "../core/observability/in-memory-run-log.js";

const description = process.argv.slice(2).join(" ").trim();
if (!description) {
  console.error('Usage: npm start -- "Собирай цены с https://example.com в JSON"');
  process.exitCode = 1;
} else {
  const probe = new HttpSiteProbe();
  const orchestrator = new HermesParserOrchestrator({
    planner: new TaskPlanner(),
    analyzer: new SiteAnalyzer({ probe: (url) => probe.inspect(url) }),
    selector: new StrategySelector(),
    log: new InMemoryRunLog(),
  });

  try {
    const result = await orchestrator.run({ description });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }, null, 2));
    process.exitCode = 1;
  }
}
