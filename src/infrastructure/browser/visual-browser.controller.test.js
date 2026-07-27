import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { VisualBrowserController } from "./visual-browser.controller.js";

const html = `<!doctype html><html><body>
  <div role="dialog" style="position:fixed;z-index:9999"><p>Cookie settings</p><button onclick="this.closest('[role=dialog]').remove()">Закрыть</button></div>
  <article class="Catalog-module__abc12__card"><b class="Catalog-module__abc12__hero">Aatrox</b><span class="Catalog-module__abc12__metric">1%</span><span class="Catalog-module__abc12__metric">11%</span><span class="Catalog-module__abc12__metric">51%</span></article>
  <article class="Catalog-module__abc12__card"><b class="Catalog-module__abc12__hero">Ahri</b><span class="Catalog-module__abc12__metric">2%</span><span class="Catalog-module__abc12__metric">12%</span><span class="Catalog-module__abc12__metric">52%</span></article>
</body></html>`;

test("visual browser guides clicks and previews arbitrary user labels", async (t) => {
  const server = createServer((_, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address();
  let confirmedSchema = null;
  const controller = new VisualBrowserController({ headless: true, onConfirm: async (schema) => {
    confirmedSchema = schema;
    return { id: "saved-config" };
  } });
  t.after(() => controller.close());

  await controller.open(`http://127.0.0.1:${port}`);
  const page = controller.page;
  assert.equal(await page.locator("#hermes-visual-toolbar").count(), 1);
  await page.waitForTimeout(100);
  assert.equal(await page.locator('[role="dialog"]').count(), 0);

  await page.locator("[data-mode=container]").click();
  await page.locator(".Catalog-module__abc12__hero").first().evaluate((element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  await page.waitForTimeout(100);
  assert.equal(controller.snapshot().schema.containerSelector, 'article[class*="Catalog-module__"][class*="__card"]');

  await page.locator("[data-mode=field]").click();
  await page.locator(".Catalog-module__abc12__hero").first().evaluate((element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  await page.locator("#hermes-visual-toolbar input").fill("любой заголовок");
  await page.locator("[data-save]").click();
  await page.waitForFunction(() => document.querySelector("[data-role=fields]").textContent.includes("любой заголовок"));

  await page.locator("[data-mode=field]").click();
  await page.locator(".Catalog-module__abc12__card").first().locator(".Catalog-module__abc12__metric").nth(2).evaluate((element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  await page.locator("#hermes-visual-toolbar input").fill("любая метрика");
  await page.locator("[data-save]").click();
  await page.waitForFunction(() => document.querySelector("[data-role=fields]").textContent.includes("любая метрика"));

  assert.equal(controller.snapshot().schema.fields[1].selector, 'span[class*="Catalog-module__"][class*="__metric"]');
  assert.equal(controller.snapshot().schema.fields[1].matchIndex, 2);
  assert.deepEqual(controller.snapshot().preview, [
    { "lyuboy_zagolovok": "Aatrox", "lyubaya_metrika": "51%" },
    { "lyuboy_zagolovok": "Ahri", "lyubaya_metrika": "52%" },
  ]);
  await page.locator("[data-confirm]").click();
  await page.waitForFunction(() => document.querySelector("[data-role=instruction]").textContent.includes("Сохраняю"));
  assert.equal(confirmedSchema.fields.length, 2);
});

test("detects CAPTCHA and pauses for manual completion instead of bypassing it", async (t) => {
  const server = createServer((_, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end('<iframe src="https://captcha.example.test/challenge" style="width:300px;height:100px"></iframe>');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const controller = new VisualBrowserController({ headless: true });
  t.after(() => controller.close());

  await controller.open(`http://127.0.0.1:${server.address().port}`);
  await controller.page.waitForTimeout(100);

  assert.deepEqual(controller.snapshot().interference, [{ type: "captcha", action: "manual-required" }]);
  assert.match(controller.snapshot().message, /CAPTCHA/u);
  assert.equal(await controller.page.locator('iframe[src*="captcha"]').count(), 1);
});
