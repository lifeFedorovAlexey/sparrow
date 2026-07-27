import test from "node:test";
import assert from "node:assert/strict";
import { createVisualSchema, selectContainer, addField } from "./visual-schema.js";

test("stores arbitrary user field names without a predefined dictionary", () => {
  let schema = createVisualSchema("https://example.com/catalog");
  schema = selectContainer(schema, "article.card");
  schema = addField(schema, { name: "плотность ткани", selector: ".density", matchIndex: 2, attribute: "text" });

  assert.deepEqual(schema.fields, [
    { name: "плотность ткани", selector: ".density", matchIndex: 2, attribute: "text" },
  ]);
});

test("rejects non-http URLs", () => {
  assert.throws(() => createVisualSchema("file:///C:/Users/life/.ssh/id_rsa"), /http/i);
});

test("rejects empty and duplicate field names", () => {
  let schema = selectContainer(createVisualSchema("https://example.com"), ".row");
  assert.throws(() => addField(schema, { name: " ", selector: ".value" }), /name/i);
  schema = addField(schema, { name: "любое поле", selector: ".value" });
  assert.throws(() => addField(schema, { name: "любое поле", selector: ".other" }), /already exists/i);
});
