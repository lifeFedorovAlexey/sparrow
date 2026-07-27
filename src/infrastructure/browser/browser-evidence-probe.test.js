import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { BrowserEvidenceProbe } from "./browser-evidence-probe.js";

const html = `<!doctype html><html><head>
<meta property="og:title" content="Catalog">
<script src="/_next/static/app.js"></script>
<script type="application/ld+json">{"@type":"ItemList"}</script>
</head><body>
<div id="__next"><main data-testid="catalog" aria-label="Products">
<section class="product-grid" style="overflow-y:auto;height:300px">
<article data-qa="product-card" itemscope><h2>One</h2></article>
<article data-qa="product-card" itemscope><h2>Two</h2></article>
<article data-qa="product-card" itemscope><h2>Three</h2></article>
</section><button>Load more</button><a rel="next" href="?page=2">Next</a>
</main></div><div id="shadow-host"></div><iframe srcdoc="<p>frame</p>"></iframe>
<script>
document.querySelector('#shadow-host').attachShadow({mode:'open'}).innerHTML='<span>shadow</span>';
fetch('/api/products?page=2');
</script></body></html>`;

test("collects evidence-backed browser profile without domain rules", async (t) => {
  const server = createServer((request, response) => {
    response.setHeader("content-type", request.url.startsWith("/api/") ? "application/json" : "text/html; charset=utf-8");
    response.setHeader("cf-ray", "fixture-ray");
    if (request.url.startsWith("/api/")) return response.end('{"items":[]}');
    response.end(html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const probe = new BrowserEvidenceProbe({ headless: true, settleMs: 100 });
  t.after(() => probe.close());

  const profile = await probe.inspect(`http://127.0.0.1:${server.address().port}/catalog`);

  assert.equal(profile.framework.value, "nextjs");
  assert.equal(profile.applicationType.value, "hybrid");
  assert.ok(profile.transports.some((claim) => claim.value === "json-ld"));
  assert.ok(profile.transports.some((claim) => claim.value === "rest"));
  assert.ok(profile.listPatterns.some((claim) => claim.value === "grid"));
  assert.ok(profile.listPatterns.some((claim) => claim.value === "load-more"));
  assert.ok(profile.listPatterns.some((claim) => claim.value === "pagination"));
  assert.ok(profile.locatorTypes.some((claim) => claim.value === "data-testid"));
  assert.ok(profile.obstacles.some((claim) => claim.value === "shadow-dom"));
  assert.ok(profile.obstacles.some((claim) => claim.value === "iframe"));
  assert.ok(profile.protections.some((claim) => claim.value === "cloudflare"));
  for (const key of ["applicationType", "framework", "transports", "listPatterns", "locatorTypes", "obstacles", "protections"]) {
    for (const claim of Array.isArray(profile[key]) ? profile[key] : [profile[key]]) {
      if (claim.value !== "unknown") assert.ok(claim.evidence.length > 0, `${key}:${claim.value}`);
    }
  }
});
