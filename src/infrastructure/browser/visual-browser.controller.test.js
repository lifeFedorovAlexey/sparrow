import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { VisualBrowserController } from "./visual-browser.controller.js";

const html = `<!doctype html><html><body>
  <article class="card"><b class="hero">Aatrox</b><span class="metric">51%</span></article>
  <article class="card"><b class="hero">Ahri</b><span class="metric">52%</span></article>
</body></html>`;

test("visual browser guides clicks and previews arbitrary user labels", async (t) => {
  const server = createServer((_, response) => response.end(html));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const controller = new VisualBrowserController({ headless: true });
  t.after(() => controller.close());

  await controller.open(`http://127.0.0.1:${port}`);
  const page = controller.page;
  assert.equal(await page.locator("#hermes-visual-toolbar").count(), 1);

  await page.locator("[data-mode=container]").click();
  await page.locator(".hero").first().evaluate((element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  await page.waitForTimeout(100);
  assert.equal(controller.snapshot().schema.containerSelector, "article.card");

  await page.locator("[data-mode=field]").click();
  await page.locator(".hero").first().evaluate((element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  await page.locator("#hermes-visual-toolbar input").fill("любой заголовок");
  await page.locator("[data-save]").click();
  await page.waitForFunction(() => document.querySelector("[data-role=fields]").textContent.includes("любой заголовок"));

  await controller.applySelection({ type: "field", name: "любая метрика", selector: ".metric", attribute: "text" });
  assert.deepEqual(controller.snapshot().preview, [
    { "любой заголовок": "Aatrox", "любая метрика": "51%" },
    { "любой заголовок": "Ahri", "любая метрика": "52%" },
  ]);
});
