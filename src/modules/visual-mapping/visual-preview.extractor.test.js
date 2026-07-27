import test from "node:test";
import assert from "node:assert/strict";
import { extractPreview } from "./visual-preview.extractor.js";

test("extracts arbitrary labeled fields from every repeated container", () => {
  const html = `
    <div class="row"><b class="hero">Aatrox</b><span data-stat="wr">51%</span></div>
    <div class="row"><b class="hero">Ahri</b><span data-stat="wr">52%</span></div>`;
  const schema = {
    url: "https://example.com",
    containerSelector: ".row",
    fields: [
      { name: "чемпион", selector: ".hero", attribute: "text" },
      { name: "винрейт", selector: "[data-stat=wr]", attribute: "text" },
    ],
  };

  assert.deepEqual(extractPreview(html, schema), [
    { чемпион: "Aatrox", винрейт: "51%" },
    { чемпион: "Ahri", винрейт: "52%" },
  ]);
});
