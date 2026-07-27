import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VisualSchemaRepository } from "./visual-schema.repository.js";

const schema = {
  version: 1,
  url: "https://example.org/catalog",
  containerSelector: ".card",
  fields: [{ name: "любое поле", selector: ".value", attribute: "text" }],
};

test("persists schemas in one registry without generating projects or scripts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hermes-schema-"));
  const registryPath = join(directory, "configurations.json");
  const repository = new VisualSchemaRepository({ registryPath });

  const saved = await repository.save(schema);
  assert.equal(saved.schema.url, schema.url);
  assert.match(saved.id, /^[a-f0-9]{16}$/u);
  assert.deepEqual(await repository.list(), [saved]);

  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  assert.equal(registry.configurations.length, 1);
  assert.equal(registry.configurations[0].schema.fields[0].name, "любое поле");
});
