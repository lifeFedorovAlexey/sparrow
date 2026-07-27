const API_PRIORITY = ["rest", "graphql", "json"];

export class StrategySelector {
  name = "strategy-selector";

  async execute({ site }) {
    for (const kind of API_PRIORITY) {
      const endpoint = site.apis?.find((api) => api.kind === kind);
      if (endpoint) {
        return {
          kind,
          endpoint: endpoint.url ?? null,
          reason: `${kind.toUpperCase()} is the highest available priority strategy`,
        };
      }
    }

    if (site.htmlAvailable) {
      return { kind: "html", endpoint: null, reason: "Static HTML is available without an API" };
    }
    if (site.javascriptRequired) {
      return { kind: "playwright", endpoint: null, reason: "The page requires JavaScript rendering" };
    }
    return { kind: "selenium", endpoint: null, reason: "Fallback strategy for an unknown interactive site" };
  }
}
