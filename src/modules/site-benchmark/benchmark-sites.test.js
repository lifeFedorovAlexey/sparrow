import test from "node:test";
import assert from "node:assert/strict";
import { benchmarkSites } from "./benchmark-sites.js";

test("contains the complete unique 55-site reference matrix", () => {
  assert.equal(benchmarkSites.length, 55);
  assert.equal(new Set(benchmarkSites.map((site) => site.name)).size, 55);
  assert.ok(benchmarkSites.every((site) => site.category && site.tier));
});
