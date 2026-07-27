import { randomUUID } from "node:crypto";

export class HermesParserOrchestrator {
  constructor({ planner, analyzer, selector, log, idFactory = randomUUID }) {
    this.planner = planner;
    this.analyzer = analyzer;
    this.selector = selector;
    this.log = log;
    this.idFactory = idFactory;
  }

  async #executeAgent(runId, agent, input) {
    const name = agent.name;
    this.log.record({ runId, agent: name, status: "started" });
    try {
      const result = await agent.execute(input, { runId });
      this.log.record({ runId, agent: name, status: "succeeded" });
      return result;
    } catch (error) {
      this.log.record({ runId, agent: name, status: "failed", details: { message: error.message } });
      throw error;
    }
  }

  async run(input) {
    const runId = this.idFactory();
    const task = await this.#executeAgent(runId, this.planner, input);
    const site = await this.#executeAgent(runId, this.analyzer, { task, url: task.url });
    const strategy = await this.#executeAgent(runId, this.selector, { task, site });

    return { runId, task, site, strategy, events: [...this.log.events] };
  }
}
