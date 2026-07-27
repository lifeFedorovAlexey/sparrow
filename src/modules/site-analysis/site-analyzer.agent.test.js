import test from "node:test";
import assert from "node:assert/strict";
import { SiteAnalyzer } from "./site-analyzer.agent.js";

test("SiteAnalyzer normalizes probe evidence into a site map", async () => {
  const analyzer = new SiteAnalyzer({
    probe: async () => ({
      headers: { "x-powered-by": "Next.js" },
      html: '<div id="__next"></div>',
      endpoints: [
        { url: "https://example.com/api/products", kind: "rest" },
        { url: "https://example.com/graphql", kind: "graphql" },
      ],
      pagination: { kind: "cursor", parameter: "after" },
      obstacles: ["cloudflare"],
    }),
  });

  const result = await analyzer.execute({ url: "https://example.com/catalog" });

  assert.equal(result.application, "nextjs");
  assert.equal(result.rendering, "ssr");
  assert.deepEqual(result.apis.map((api) => api.kind), ["rest", "graphql"]);
  assert.deepEqual(result.pagination, { kind: "cursor", parameter: "after" });
  assert.deepEqual(result.obstacles, ["cloudflare"]);
});
