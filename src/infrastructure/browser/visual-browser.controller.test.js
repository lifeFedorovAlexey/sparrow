import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { VisualBrowserController } from "./visual-browser.controller.js";

const html = `<!doctype html><html><body>
  <article class="card"><b class="hero">Aatrox</b><span class="metric">51%</span></article>
  <article class="card"><b class="hero">Ahri</b><span class="metric">52%</span></article>
</body></html>`;

test("visual browser injects overlay and previews arbitrary user labels", async (t) => {
  const server = createServer((_, response) => response.end(html));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const controller = new VisualBrowserController({ headless: true });
  t.after(() => controller.close());

  await controller.open(`http://127.0.0.1:${port}`);
  assert.equal(await controller.page.locator("#hermes-visual-toolbar").count(), 1);
  await controller.applySelection({ type: "container", selector: "article.card", count: 2 });
  await controller.applySelection({ type: "field", name: "любой заголовок", selector: ".hero", attribute: "text" });
  await controller.applySelection({ type: "field", name: "любая метрика", selector: ".metric", attribute: "text" });

  assert.deepEqual(controller.snapshot().preview, [
    { "любой заголовок": "Aatrox", "любая метрика": "51%" },
    { "любой заголовок": "Ahri", "любая метрика": "52%" },
  ]);
});
