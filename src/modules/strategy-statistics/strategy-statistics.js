function canonicalize(value) {
  if (Array.isArray(value)) return [...value].sort();
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export class StrategyStatistics {
  #events = [];

  signature(features) {
    return JSON.stringify(canonicalize(features));
  }

  record(event) {
    this.#events.push(Object.freeze({ ...event, signature: this.signature(event.features) }));
  }

  rank(features) {
    const signature = this.signature(features);
    const groups = new Map();
    for (const event of this.#events.filter((item) => item.signature === signature)) {
      const current = groups.get(event.strategy) ?? { strategy: event.strategy, attempts: 0, successes: 0, records: 0 };
      current.attempts += 1;
      current.successes += Number(event.success);
      current.records += event.records ?? 0;
      groups.set(event.strategy, current);
    }
    return [...groups.values()]
      .map((item) => ({ ...item, successRate: item.successes / item.attempts }))
      .sort((left, right) => right.successRate - left.successRate || right.records - left.records);
  }

  siteHistory(site) {
    return this.#events.filter((event) => event.site === site);
  }
}
