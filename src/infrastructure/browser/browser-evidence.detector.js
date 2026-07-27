import { validateEvidenceProfile } from "../../modules/site-benchmark/evidence-profile.js";

const evidence = (kind, detail, source = "browser") => ({ kind, detail, source });
const claim = (value, kind, detail, source) => ({ value, evidence: [evidence(kind, detail, source)] });
const unknown = () => ({ value: "unknown", evidence: [] });
const unique = (claims) => [...new Map(claims.map((item) => [item.value, item])).values()];
const valuesOrUnknown = (claims) => claims.length ? unique(claims) : [unknown()];

function detectFramework(dom, responses) {
  if (dom.next) return claim("nextjs", "dom-marker", dom.next, "browser:dom");
  if (dom.nuxt) return claim("nuxt", "dom-marker", dom.nuxt, "browser:dom");
  if (dom.angular) return claim("angular", "dom-marker", dom.angular, "browser:dom");
  if (dom.react) return claim("react", "dom-marker", dom.react, "browser:dom");
  if (dom.vue) return claim("vue", "dom-marker", dom.vue, "browser:dom");
  const powered = responses.find((item) => /next\.js/iu.test(item.headers["x-powered-by"] ?? ""));
  return powered ? claim("nextjs", "response-header", "x-powered-by: Next.js", powered.url) : unknown();
}

function detectTransports(dom, responses) {
  const result = [];
  const documentResponses = responses.filter((item) => item.resourceType === "document");
  const documentResponse = [...documentResponses].reverse().find((item) => item.url === dom.pageUrl) ?? documentResponses.at(-1);
  if (documentResponse) result.push(claim("html", "response", `HTTP ${documentResponse.status} ${documentResponse.contentType}`, documentResponse.url));
  if (dom.jsonLd) result.push(claim("json-ld", "dom-marker", `${dom.jsonLd} application/ld+json script(s)`, "browser:dom"));
  if (dom.jsonScript) result.push(claim("json-script", "dom-marker", `${dom.jsonScript} embedded JSON script(s)`, "browser:dom"));
  if (dom.microdata) result.push(claim("microdata", "dom-marker", `${dom.microdata} itemscope node(s)`, "browser:dom"));
  if (dom.openGraph) result.push(claim("opengraph", "dom-marker", `${dom.openGraph} og:* meta tag(s)`, "browser:dom"));
  for (const response of responses.filter((item) => item.resourceType === "xhr" || item.resourceType === "fetch")) {
    const kind = /graphql/iu.test(response.url) ? "graphql" : /json/iu.test(response.contentType) ? "rest" : response.resourceType;
    result.push(claim(kind, "network-response", `${response.resourceType} ${response.status} ${response.contentType}`, response.url));
  }
  if (dom.webSockets.length) result.push(claim("websocket", "network-event", `${dom.webSockets.length} WebSocket connection(s)`, dom.webSockets[0]));
  return valuesOrUnknown(result);
}

function detectApplication(framework, dom, transports, responses) {
  const finalDocument = [...responses].reverse().find((item) => item.resourceType === "document" && item.url === dom.pageUrl)
    ?? [...responses].reverse().find((item) => item.resourceType === "document");
  if (!finalDocument || finalDocument.status >= 300) return unknown();
  const hasApi = transports.some((item) => ["rest", "graphql", "websocket"].includes(item.value));
  const hydrated = ["nextjs", "nuxt"].includes(framework.value);
  if (hydrated && dom.meaningfulText && hasApi) return claim("hybrid", "combined-observation", "server-visible content plus client data transport", "browser:dom+network");
  if (hydrated && dom.meaningfulText) return claim("ssr", "combined-observation", "framework hydration marker with server-visible content", "browser:dom");
  if (["react", "vue", "angular"].includes(framework.value) && hasApi) return claim("spa", "combined-observation", "client framework root plus dynamic data transport", "browser:dom+network");
  if (dom.meaningfulText && !hasApi) return claim("mpa", "combined-observation", "meaningful HTML without observed dynamic data transport", "browser:dom+network");
  return unknown();
}

function detectListPatterns(dom) {
  const result = [];
  if (dom.tables) result.push(claim("table", "dom-structure", `${dom.tables} table(s)`, "browser:dom"));
  if (dom.grids) result.push(claim("grid", "dom-structure", `${dom.grids} grid candidate(s)`, "browser:dom"));
  if (dom.cards >= 3) result.push(claim("cards", "repetition", `${dom.cards} repeated card/article nodes`, "browser:dom"));
  if (dom.virtualLists) result.push(claim("virtual-list", "dom-structure", `${dom.virtualLists} virtualized list candidate(s)`, "browser:dom"));
  if (dom.lazyNodes) result.push(claim("lazy-render", "dom-marker", `${dom.lazyNodes} lazy node(s)`, "browser:dom"));
  if (dom.carousels) result.push(claim("carousel", "dom-marker", `${dom.carousels} carousel candidate(s)`, "browser:dom"));
  if (dom.infiniteScroll) result.push(claim("infinite-scroll", "dom-marker", dom.infiniteScroll, "browser:dom"));
  if (dom.loadMore) result.push(claim("load-more", "control", dom.loadMore, "browser:dom"));
  if (dom.pagination) result.push(claim("pagination", "control", dom.pagination, "browser:dom"));
  return valuesOrUnknown(result);
}

function detectLocatorTypes(dom) {
  const result = [claim("css", "capability", "DOM supports CSS selectors", "browser:dom")];
  if (dom.testIds) result.push(claim("data-testid", "stable-attribute", `${dom.testIds} data-testid node(s)`, "browser:dom"));
  if (dom.dataQa) result.push(claim("data-qa", "stable-attribute", `${dom.dataQa} data-qa node(s)`, "browser:dom"));
  if (dom.aria) result.push(claim("aria", "stable-attribute", `${dom.aria} ARIA-labelled node(s)`, "browser:dom"));
  if (dom.roles) result.push(claim("role", "stable-attribute", `${dom.roles} explicit role node(s)`, "browser:dom"));
  if (dom.testIds || dom.dataQa || dom.aria || dom.roles) result.push(claim("stable-hybrid", "composition", "stable attributes can be combined with relative CSS", "browser:dom"));
  return unique(result);
}

function detectObstacles(dom) {
  const result = [];
  const add = (value, count, detail = `${count} matching node(s)`) => count && result.push(claim(value, "dom-observation", detail, "browser:dom"));
  add("shadow-dom", dom.shadowRoots);
  add("iframe", dom.iframes);
  add("canvas", dom.canvas);
  add("svg", dom.svg);
  add("cookie-banner", dom.cookieDialogs);
  add("popup", dom.dialogs);
  add("hydration", dom.hydration, dom.hydration);
  add("lazy-loading", dom.lazyNodes);
  add("dynamic-classes", dom.dynamicClasses);
  add("random-ids", dom.randomIds);
  return valuesOrUnknown(result);
}

function detectProtections(dom, responses) {
  const result = [];
  for (const response of responses) {
    const headerNames = Object.keys(response.headers).join(" ");
    const server = response.headers.server ?? "";
    if (/cf-ray/iu.test(headerNames) || /cloudflare/iu.test(server)) result.push(claim("cloudflare", "response-header", `server=${server}; cf-ray=${response.headers["cf-ray"] ?? "present"}`, response.url));
    if (response.status === 429) result.push(claim("rate-limit", "http-status", "HTTP 429", response.url));
    if ([403, 418, 429, 498].includes(response.status)) result.push(claim("access-blocked", "http-status", `HTTP ${response.status}`, response.url));
    if (/akamai/iu.test(`${server} ${headerNames}`)) result.push(claim("akamai", "response-header", `server=${server}`, response.url));
    if (/imperva|incapsula/iu.test(`${server} ${headerNames}`)) result.push(claim("imperva", "response-header", `server=${server}`, response.url));
  }
  for (const item of dom.protectionMarkers) result.push(claim(item.value, "dom-marker", item.detail, "browser:dom"));
  return valuesOrUnknown(result);
}

export function buildEvidenceProfile({ site, dom, responses }) {
  const framework = detectFramework(dom, responses);
  const transports = detectTransports(dom, responses);
  return validateEvidenceProfile({
    site,
    applicationType: detectApplication(framework, dom, transports, responses),
    framework,
    transports,
    listPatterns: detectListPatterns(dom),
    locatorTypes: detectLocatorTypes(dom),
    obstacles: detectObstacles(dom),
    protections: detectProtections(dom, responses),
    observedAt: new Date().toISOString(),
  });
}
