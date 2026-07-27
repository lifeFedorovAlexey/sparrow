import { detectApplication, detectRendering } from "./site-technology.detector.js";

export class SiteAnalyzer {
  name = "site-analyzer";

  constructor({ probe } = {}) {
    this.probe = probe ?? (async () => {
      throw new Error("SiteAnalyzer requires a probe adapter");
    });
  }

  async execute({ url }) {
    const evidence = await this.probe(url);
    const application = detectApplication(evidence);
    const rendering = detectRendering(application, evidence);

    return {
      url,
      application,
      rendering,
      apis: [...(evidence.endpoints ?? [])],
      pagination: evidence.pagination ?? { kind: "unknown" },
      obstacles: [...(evidence.obstacles ?? [])],
      htmlAvailable: Boolean(evidence.html),
      javascriptRequired: evidence.javascriptRequired ?? rendering === "spa",
    };
  }
}
