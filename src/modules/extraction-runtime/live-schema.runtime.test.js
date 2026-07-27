import test from "node:test";
import assert from "node:assert/strict";
import { LiveSchemaRuntime } from "./live-schema.runtime.js";

test("executes any declarative schema through the shared runtime", async () => {
  const page = {
    $$eval: async (selector, _extract, fields) => [{ selector, fields: fields.map((field) => field.name) }],
  };
  const schema = {
    containerSelector: ".row",
    fields: [{ name: "произвольное поле", selector: ".value", attribute: "text" }],
  };
  assert.deepEqual(await new LiveSchemaRuntime().execute(page, schema), [
    { selector: ".row", fields: ["произвольное поле"] },
  ]);
});
