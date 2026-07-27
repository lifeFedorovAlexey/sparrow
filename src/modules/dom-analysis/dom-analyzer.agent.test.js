import test from "node:test";
import assert from "node:assert/strict";
import { DomAnalyzer } from "./dom-analyzer.agent.js";

const html = `
  <main>
    <article class="product-card"><h2 class="title">Alpha</h2><span class="price">100 ₽</span><a class="details" href="/a">Открыть</a></article>
    <article class="product-card"><h2 class="title">Beta</h2><span class="price">200 ₽</span><a class="details" href="/b">Открыть</a></article>
    <article class="product-card"><h2 class="title">Gamma</h2><span class="price">300 ₽</span><a class="details" href="/c">Открыть</a></article>
  </main>`;

test("finds a repeated item container and stable field selectors", async () => {
  const result = await new DomAnalyzer().execute({ html });

  assert.equal(result.primaryContainer.selector, "article.product-card");
  assert.equal(result.primaryContainer.count, 3);
  assert.deepEqual(
    result.primaryContainer.fields.map((field) => field.selector),
    [".title", ".price", ".details"],
  );
  assert.deepEqual(result.primaryContainer.fields[1].samples, ["100 ₽", "200 ₽", "300 ₽"]);
});

test("reports that no collection is present", async () => {
  const result = await new DomAnalyzer().execute({ html: "<main><h1>Single page</h1></main>" });
  assert.equal(result.primaryContainer, null);
  assert.deepEqual(result.containers, []);
});
