import { StrategyRegistry } from "../strategy-composition/strategy-registry.js";

function countBy(items) {
  const counts = {};
  for (const item of items) counts[item] = (counts[item] ?? 0) + 1;
  return counts;
}

export class BenchmarkRunner {
  constructor({ probe, strategies = new StrategyRegistry() }) {
    if (!probe?.inspect) throw new Error("BenchmarkRunner requires a probe");
    this.probe = probe;
    this.strategies = strategies;
  }

  async run(sites) {
    const results = [];
    for (const site of sites) {
      try {
        const profile = await this.probe.inspect(site.url);
        const strategies = this.strategies.compose(profile).map(({ id }) => id);
        results.push({ ...site, status: "succeeded", profile, strategies });
      } catch (error) {
        results.push({ ...site, status: "failed", error: error instanceof Error ? error.message : String(error), strategies: [] });
      }
    }
    const succeeded = results.filter((item) => item.status === "succeeded");
    return {
      generatedAt: new Date().toISOString(),
      summary: {
        total: results.length,
        succeeded: succeeded.length,
        failed: results.length - succeeded.length,
        strategyUsage: countBy(succeeded.flatMap((item) => item.strategies)),
      },
      sites: results,
    };
  }
}
