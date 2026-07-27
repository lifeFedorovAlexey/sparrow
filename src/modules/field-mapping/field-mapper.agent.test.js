import test from "node:test";
import assert from "node:assert/strict";
import { FieldMapper } from "./field-mapper.agent.js";

const dom = {
  primaryContainer: {
    selector: "article.product-card",
    count: 2,
    fields: [
      { selector: ".product-name", samples: ["Alpha", "Beta"], attribute: "text" },
      { selector: ".current-price", samples: ["100 ₽", "200 ₽"], attribute: "text" },
      { selector: "a.details", samples: ["Открыть", "Открыть"], attribute: "href" },
    ],
  },
};

test("maps requested semantic fields to discovered selectors", async () => {
  const result = await new FieldMapper().execute({ requestedFields: ["title", "price"], dom });

  assert.deepEqual(result.mappings, [
    { field: "title", selector: ".product-name", attribute: "text", confidence: "high" },
    { field: "price", selector: ".current-price", attribute: "text", confidence: "high" },
  ]);
  assert.deepEqual(result.unmapped, []);
});

test("keeps unresolved fields explicit instead of guessing", async () => {
  const result = await new FieldMapper().execute({ requestedFields: ["vin"], dom });
  assert.deepEqual(result.mappings, []);
  assert.deepEqual(result.unmapped, ["vin"]);
});
