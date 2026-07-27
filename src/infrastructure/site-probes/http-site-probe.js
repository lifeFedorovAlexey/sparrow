import {
  detectObstacles,
  detectPagination,
  extractEndpoints,
} from "./site-evidence.detector.js";

export class HttpSiteProbe {
  constructor({ fetchImpl = fetch, timeoutMs = 15_000 } = {}) {
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async #fetch(url) {
    return this.fetchImpl(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(this.timeoutMs),
      headers: { "user-agent": "HermesParserAI/0.1 (+site-analysis)" },
    });
  }

  async #inspectRobots(target) {
    try {
      const response = await this.#fetch(new URL("/robots.txt", target));
      if (!response.ok) return { available: false, sitemaps: [] };
      const text = await response.text();
      return {
        available: true,
        sitemaps: [...text.matchAll(/^sitemap:\s*(.+)$/gimu)].map((match) => match[1].trim()),
      };
    } catch {
      return { available: false, sitemaps: [] };
    }
  }

  async inspect(url) {
    const target = new URL(url);
    const response = await this.#fetch(target);
    if (!response.ok) throw new Error(`Site returned HTTP ${response.status}`);

    const html = await response.text();
    const headers = Object.fromEntries(response.headers.entries());
    const endpoints = extractEndpoints(html, target);

    return {
      headers,
      html,
      endpoints,
      pagination: detectPagination(endpoints.map((endpoint) => endpoint.url), html),
      obstacles: detectObstacles(headers, html, response.status),
      robots: await this.#inspectRobots(target),
      javascriptRequired: /__next|__nuxt|data-reactroot|ng-version/iu.test(html),
    };
  }
}
