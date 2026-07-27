import test from "node:test";
import assert from "node:assert/strict";
import { HttpSiteProbe } from "./http-site-probe.js";

test("HttpSiteProbe captures HTML, headers, API hints, and common obstacles", async () => {
  const fetchImpl = async (url) => {
    if (String(url).endsWith("/robots.txt")) return new Response("User-agent: *\nSitemap: https://example.com/sitemap.xml", { status: 200 });
    return new Response(
      '<html><script src="/_next/static/app.js"></script><script>fetch("/api/products?page=2")</script></html>',
      { status: 200, headers: { "content-type": "text/html", server: "cloudflare", "x-powered-by": "Next.js" } },
    );
  };
  const probe = new HttpSiteProbe({ fetchImpl });

  const result = await probe.inspect("https://example.com/catalog");

  assert.match(result.html, /_next/);
  assert.equal(result.endpoints[0].kind, "rest");
  assert.equal(result.endpoints[0].url, "https://example.com/api/products?page=2");
  assert.deepEqual(result.pagination, { kind: "page", parameter: "page" });
  assert.deepEqual(result.obstacles, ["cloudflare"]);
  assert.equal(result.robots.available, true);
  assert.deepEqual(result.robots.sitemaps, ["https://example.com/sitemap.xml"]);
});
