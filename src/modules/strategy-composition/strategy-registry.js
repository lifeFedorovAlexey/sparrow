const has = (values, value) => values?.includes(value);

const definitions = [
  { id: "structured-data-first", when: (p) => has(p.transports, "json-ld") || has(p.transports, "microdata") || has(p.transports, "embedded-json") },
  { id: "api-first", when: (p) => ["rest", "graphql", "xhr", "fetch"].some((kind) => has(p.transports, kind)) },
  { id: "html-dom", when: (p) => has(p.transports, "html") && !["rest", "graphql", "xhr", "fetch", "json-ld"].some((kind) => has(p.transports, kind)) },
  { id: "frame-tree", when: (p) => has(p.obstacles, "iframe") },
  { id: "shadow-dom", when: (p) => has(p.obstacles, "shadow-dom") },
  { id: "browser-hydration", when: (p) => has(p.obstacles, "hydration") },
  { id: "virtual-list", when: (p) => has(p.listPatterns, "virtual-list") || has(p.listPatterns, "lazy-render") },
  { id: "scroll-collector", when: (p) => has(p.listPatterns, "infinite-scroll") },
  { id: "load-more", when: (p) => has(p.listPatterns, "load-more") },
  { id: "pagination", when: (p) => has(p.listPatterns, "pagination") || has(p.listPatterns, "api-pagination") },
  { id: "stream-collector", when: (p) => has(p.transports, "websocket") || has(p.transports, "streaming") },
  { id: "rate-limiter", when: (p) => has(p.protections, "rate-limit") },
  { id: "protected-session-gate", when: (p) => ["captcha", "cloudflare", "datadome", "akamai", "imperva", "turnstile", "recaptcha", "hcaptcha", "fingerprint"].some((kind) => has(p.protections, kind)) },
];

export class StrategyRegistry {
  compose(profile) {
    return definitions.filter((strategy) => strategy.when(profile)).map(({ id }) => ({ id }));
  }
}
