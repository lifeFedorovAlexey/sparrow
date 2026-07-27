import { randomUUID } from "node:crypto";

export class HermesParserOrchestrator {
  constructor({ planner, analyzer, selector, domAnalyzer, fieldMapper, generator, validator, log, idFactory = randomUUID }) {
    Object.assign(this, { planner, analyzer, selector, domAnalyzer, fieldMapper, generator, validator, log, idFactory });
  }

  async #executeAgent(runId, agent, input) {
    this.log.record({ runId, agent: agent.name, status: "started" });
    try {
      const result = await agent.execute(input, { runId });
      this.log.record({ runId, agent: agent.name, status: "succeeded" });
      return result;
    } catch (error) {
      this.log.record({ runId, agent: agent.name, status: "failed", details: { message: error.message } });
      throw error;
    }
  }

  async run(input) {
    const runId = this.idFactory();
    const task = await this.#executeAgent(runId, this.planner, input);
    const site = await this.#executeAgent(runId, this.analyzer, { task, url: task.url });
    const strategy = await this.#executeAgent(runId, this.selector, { task, site });
    const baseResult = { runId, task, site, strategy };
    if (!this.domAnalyzer || !this.fieldMapper || !this.generator || !this.validator) {
      return { ...baseResult, events: [...this.log.events] };
    }
    if (strategy.kind !== "html") throw new Error(`Project generation for strategy '${strategy.kind}' is not implemented yet`);

    const dom = await this.#executeAgent(runId, this.domAnalyzer, { html: site.html, site });
    if (!dom.primaryContainer) throw new Error("No repeated item container was found on the page");
    const fields = await this.#executeAgent(runId, this.fieldMapper, { requestedFields: task.fields, dom });
    if (!fields.mappings.length) throw new Error("No fields were mapped; project generation was stopped");
    if (fields.unmapped.length) throw new Error(`Could not map requested fields: ${fields.unmapped.join(", ")}`);

    const project = await this.#executeAgent(runId, this.generator, {
      projectName: new URL(task.url).hostname,
      task,
      containerSelector: dom.primaryContainer.selector,
      mappings: fields.mappings,
    });
    const validation = await this.#executeAgent(runId, this.validator, {
      projectPath: project.projectPath,
      requiredFields: task.fields,
    });
    return { ...baseResult, dom, fields, project, validation, events: [...this.log.events] };
  }
}
