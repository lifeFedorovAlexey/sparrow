import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFieldKey } from "./normalize-field-key.js";

test("transliterates Cyrillic labels into safe JSON field keys", () => {
  assert.equal(normalizeFieldKey("Средний винрейт, %"), "sredniy_vinreyt");
  assert.equal(normalizeFieldKey("ПИКРЕЙТ"), "pikreyt");
  assert.equal(normalizeFieldKey("Цена ₽ / штука"), "tsena_shtuka");
});

test("produces identifier-like keys without special characters", () => {
  assert.equal(normalizeFieldKey("  Engine Power (kW) "), "engine_power_kw");
  assert.equal(normalizeFieldKey("123 значение"), "field_123_znachenie");
  assert.match(normalizeFieldKey("Поле №1"), /^[a-z_][a-z0-9_]*$/u);
});

test("rejects labels that contain no usable characters", () => {
  assert.throws(() => normalizeFieldKey("🔥 %"), /название/i);
});
