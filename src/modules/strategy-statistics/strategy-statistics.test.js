import test from "node:test";
import assert from "node:assert/strict";
import { StrategyStatistics } from "./strategy-statistics.js";

test("ranks strategies by feature signature while retaining per-site diagnostics", () => {
  const statistics = new StrategyStatistics();
  const features = { transports: ["json-ld", "html"], listPatterns: ["grid"] };
  statistics.record({ site: "Site A", features, strategy: "structured-data-first", success: true, records: 40 });
  statistics.record({ site: "Site B", features, strategy: "html-dom", success: false, records: 0 });
  statistics.record({ site: "Site C", features, strategy: "structured-data-first", success: true, records: 20 });

  assert.deepEqual(statistics.rank(features).map(({ strategy, successRate }) => ({ strategy, successRate })), [
    { strategy: "structured-data-first", successRate: 1 },
    { strategy: "html-dom", successRate: 0 },
  ]);
  assert.equal(statistics.siteHistory("Site A")[0].records, 40);
});

test("feature signatures are order-independent and contain no hostname", () => {
  const statistics = new StrategyStatistics();
  const left = statistics.signature({ transports: ["html", "rest"], obstacles: ["hydration"] });
  const right = statistics.signature({ obstacles: ["hydration"], transports: ["rest", "html"] });
  assert.equal(left, right);
  assert.doesNotMatch(left, /example\.com/iu);
});
