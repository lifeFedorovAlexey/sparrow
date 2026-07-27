import { inspectRepeatedContainers } from "./repeated-container.inspector.js";

export class DomAnalyzer {
  name = "dom-analyzer";

  async execute({ html }) {
    const containers = inspectRepeatedContainers(String(html ?? ""));
    return {
      primaryContainer: containers[0] ?? null,
      containers,
    };
  }
}
