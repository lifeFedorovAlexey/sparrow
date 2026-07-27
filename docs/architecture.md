# Architecture

## MVP execution graph

```text
User request
    │
    ▼
TaskPlanner ──► FormalTask
    │
    ▼
SiteAnalyzer ◄── SiteProbe adapter
    │
    ▼
StrategySelector ──► REST | GraphQL | JSON | HTML | Playwright | Selenium
    │
    ▼
Run result + audit events
```

`HermesParserOrchestrator` coordinates this graph. It does not parse task text, inspect HTML, or select scraping technologies itself.

## Agent contract

Every agent exposes:

```js
{
  name: "agent-name",
  async execute(input, context) {
    return output;
  }
}
```

This keeps model selection outside domain behavior. A deterministic agent can later be replaced with an LLM-backed implementation without changing the orchestrator.

## Current source layout

```text
src/
  app/
    cli.js
  core/
    orchestration/
      orchestrator.js
      orchestrator.test.js
    observability/
      in-memory-run-log.js
  modules/
    task-planning/
      task-planner.agent.js
      task-description.parser.js
      task-planner.agent.test.js
    site-analysis/
      site-analyzer.agent.js
      site-technology.detector.js
      site-analyzer.agent.test.js
    strategy-selection/
      strategy-selector.agent.js
      strategy-selector.agent.test.js
  infrastructure/
    site-probes/
      http-site-probe.js
      site-evidence.detector.js
      http-site-probe.test.js
```

Tests are colocated with the behavior they verify. Modules own domain logic; `infrastructure` owns external I/O; `core` contains only orchestration and cross-cutting concerns.

## Planned modules

```text
src/modules/
  dom-analysis/
  pagination-analysis/
  field-mapping/
  project-generation/
  code-generation/
  validation/
  self-repair/
  exporting/
  scheduling/
  project-management/

src/infrastructure/
  browser-probes/
  model-providers/
  persistence/
  execution-sandboxes/
```

## Persistence model (next slice)

The durable store will retain projects, immutable versions, run logs, generated artifacts, selector outcomes, strategy outcomes, validation reports, and repair diffs. User change requests create a new version of an existing project rather than a new project.

## Safety boundaries

- Respect `robots.txt` and explicit user authorization boundaries.
- Keep credentials outside generated source code.
- Limit requests and concurrency per target.
- Generate parsers into isolated workspaces.
- Execute generated code in containers with resource and network policies.
- Limit self-repair to ten attempts and preserve every diff.
