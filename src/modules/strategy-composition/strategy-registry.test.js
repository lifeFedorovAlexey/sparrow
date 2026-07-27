import test from "node:test";
import assert from "node:assert/strict";
import { StrategyRegistry } from "./strategy-registry.js";

const registry = new StrategyRegistry();

test("combines independent strategies from evidence instead of choosing one fallback", () => {
  const plan = registry.compose({
    transports: ["graphql", "json-ld"],
    listPatterns: ["virtual-list", "infinite-scroll"],
    obstacles: ["shadow-dom", "iframe", "hydration"],
    protections: ["rate-limit"],
  });
  assert.deepEqual(plan.map((item) => item.id), [
    "structured-data-first", "api-first", "frame-tree", "shadow-dom",
    "browser-hydration", "virtual-list", "scroll-collector", "rate-limiter",
  ]);
});

test("does not add site-specific strategies or protection bypasses", () => {
  const plan = registry.compose({ transports: ["html"], listPatterns: ["pagination"], obstacles: [], protections: ["captcha"] });
  assert.deepEqual(plan.map((item) => item.id), ["html-dom", "pagination", "protected-session-gate"]);
  assert.ok(plan.every((item) => !/avito|ozon|wildberries/iu.test(item.id)));
});

test("composes directly from evidence-backed claim objects", () => {
  const evidence = [{ kind: "fixture", detail: "observed", source: "test" }];
  const strategies = registry.compose({
    transports: [{ value: "json-script", evidence }, { value: "rest", evidence }],
    listPatterns: [{ value: "pagination", evidence }],
    obstacles: [{ value: "shadow-dom", evidence }],
    protections: [{ value: "unknown", evidence: [] }],
  }).map(({ id }) => id);

  assert.deepEqual(strategies, ["structured-data-first", "api-first", "shadow-dom", "pagination"]);
});

test("uses an automatic protection-aware session unless an actual challenge blocks access", () => {
  assert.deepEqual(registry.compose({ protections: ["cloudflare"] }).map(({ id }) => id), ["protection-aware-session"]);
  assert.deepEqual(registry.compose({ protections: ["cloudflare", "access-blocked"] }).map(({ id }) => id), [
    "protection-aware-session", "protected-session-gate",
  ]);
});
