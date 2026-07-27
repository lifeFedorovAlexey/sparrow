import test from "node:test";
import assert from "node:assert/strict";
import { BenchmarkRunner } from "./benchmark-runner.js";

const evidence = [{ kind: "fixture", detail: "observed", source: "test" }];
const profile = (site) => ({
  site,
  applicationType: { value: "hybrid", evidence },
  framework: { value: "nextjs", evidence },
  transports: [{ value: "json-ld", evidence }, { value: "rest", evidence }],
  listPatterns: [{ value: "pagination", evidence }],
  locatorTypes: [{ value: "data-testid", evidence }],
  obstacles: [{ value: "hydration", evidence }],
  protections: [{ value: "unknown", evidence: [] }],
});

test("runs generic evidence probes and derives composable strategies", async () => {
  const inspected = [];
  const runner = new BenchmarkRunner({ probe: { inspect: async (url) => (inspected.push(url), profile(url)) } });
  const report = await runner.run([
    { name: "One", url: "https://one.example/catalog" },
    { name: "Two", url: "https://two.example/search" },
  ]);

  assert.deepEqual(inspected, ["https://one.example/catalog", "https://two.example/search"]);
  assert.equal(report.summary.succeeded, 2);
  assert.deepEqual(report.sites[0].strategies, ["structured-data-first", "api-first", "browser-hydration", "pagination"]);
});

test("keeps failures explicit and continues with remaining sites", async () => {
  const runner = new BenchmarkRunner({ probe: { inspect: async (url) => {
    if (url.includes("blocked")) throw new Error("navigation timeout");
    return profile(url);
  } } });
  const report = await runner.run([
    { name: "Blocked", url: "https://blocked.example" },
    { name: "Open", url: "https://open.example" },
  ]);

  assert.equal(report.summary.failed, 1);
  assert.equal(report.sites[0].status, "failed");
  assert.equal(report.sites[0].error, "navigation timeout");
  assert.equal(report.sites[1].status, "succeeded");
});

test("reports access challenges as blocked instead of successful coverage", async () => {
  const blocked = profile("https://blocked.example");
  blocked.protections = [{ value: "access-blocked", evidence: [{ kind: "http-status", detail: "HTTP 498", source: "https://blocked.example" }] }];
  const runner = new BenchmarkRunner({ probe: { inspect: async () => blocked } });

  const report = await runner.run([{ name: "Blocked", url: "https://blocked.example" }]);

  assert.equal(report.summary.blocked, 1);
  assert.equal(report.summary.succeeded, 0);
  assert.equal(report.sites[0].status, "blocked");
  assert.ok(report.sites[0].strategies.includes("protected-session-gate"));
});
