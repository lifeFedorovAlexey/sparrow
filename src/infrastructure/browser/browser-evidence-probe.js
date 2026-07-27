import { chromium } from "playwright-core";
import { buildEvidenceProfile } from "./browser-evidence.detector.js";

function inspectDom() {
  const count = (selector) => document.querySelectorAll(selector).length;
  const marker = (selector) => document.querySelector(selector)?.outerHTML.slice(0, 180) ?? null;
  const text = document.body?.innerText?.replace(/\s+/gu, " ").trim() ?? "";
  const nodes = [...document.querySelectorAll("*")];
  const gridCandidates = nodes.filter((node) => {
    const display = getComputedStyle(node).display;
    return display === "grid" || node.getAttribute("role") === "grid" || /(?:^|[-_])grid(?:$|[-_])/iu.test(node.className || "");
  }).length;
  const virtualLists = [...document.querySelectorAll("[aria-rowcount]")].filter((node) => {
    const total = Number(node.getAttribute("aria-rowcount"));
    return total > node.querySelectorAll('[role="row"]').length;
  }).length;
  const controls = [...document.querySelectorAll("button, a, [role=button]")];
  const loadMore = controls.find((node) => /^(load more|show more|показать ещё|показать еще|загрузить ещё|загрузить еще)$/iu.test(node.textContent.trim()));
  const next = document.querySelector('a[rel="next"], link[rel="next"], [aria-label*="next" i], [aria-label*="след" i]');
  const hydration = marker("#__next, #__nuxt, [data-reactroot], [ng-version]");
  const protectionMarkers = [];
  const protectionSelectors = [
    ["turnstile", '.cf-turnstile, iframe[src*="turnstile" i]'],
    ["recaptcha", '.g-recaptcha, iframe[src*="recaptcha" i]'],
    ["hcaptcha", '.h-captcha, iframe[src*="hcaptcha" i]'],
    ["datadome", '[class*="datadome" i], script[src*="datadome" i]'],
  ];
  for (const [value, selector] of protectionSelectors) {
    const found = document.querySelector(selector);
    if (found) protectionMarkers.push({ value, detail: found.outerHTML.slice(0, 180) });
  }
  return {
    pageUrl: location.href,
    next: marker("#__next, script[src*='/_next/']"),
    nuxt: marker("#__nuxt, script[src*='/_nuxt/']"),
    angular: marker("[ng-version]"),
    react: marker("[data-reactroot], [data-reactid]"),
    vue: marker("[data-v-app], [data-v-00000000]") || (nodes.find((node) => [...node.attributes].some((attribute) => /^data-v-[\da-f]+$/iu.test(attribute.name)))?.outerHTML.slice(0, 180) ?? null),
    meaningfulText: text.length >= 20,
    jsonLd: count('script[type="application/ld+json"]'),
    jsonScript: count('script[type="application/json"], script[id="__NEXT_DATA__"], script[id="__NUXT_DATA__"]'),
    microdata: count("[itemscope], [itemprop]"),
    openGraph: count('meta[property^="og:"]'),
    tables: count("table"),
    grids: gridCandidates,
    cards: count('article, [class*="card" i], [data-testid*="card" i], [data-qa*="card" i]'),
    virtualLists,
    lazyNodes: count('[loading="lazy"], [data-lazy], [class*="lazy" i]'),
    carousels: count('[aria-roledescription="carousel"], [class*="carousel" i], [class*="swiper" i]'),
    infiniteScroll: marker('[class*="infinite" i], [data-infinite-scroll], [data-testid*="infinite" i]'),
    loadMore: loadMore?.outerHTML.slice(0, 180) ?? null,
    pagination: next?.outerHTML.slice(0, 180) ?? null,
    testIds: count("[data-testid]"),
    dataQa: count("[data-qa]"),
    aria: count("[aria-label], [aria-labelledby]"),
    roles: count("[role]"),
    shadowRoots: nodes.filter((node) => node.shadowRoot).length,
    iframes: count("iframe"),
    canvas: count("canvas"),
    svg: count("svg"),
    dialogs: count('[role="dialog"], dialog[open], [aria-modal="true"]'),
    cookieDialogs: [...document.querySelectorAll('[role="dialog"], dialog[open], [aria-modal="true"]')].filter((node) => /cookie|cookies|куки|файл(?:ы)? cookie/iu.test(node.textContent)).length,
    hydration,
    dynamicClasses: nodes.filter((node) => [...node.classList].some((token) => /(?:^|[-_])[a-z]*[\da-f]{6,}(?:$|[-_])/iu.test(token))).length,
    randomIds: nodes.filter((node) => /^(?:[\da-f]{8}-[\da-f-]{27,}|[a-z]*[\dA-Z]{12,})$/u.test(node.id)).length,
    protectionMarkers,
    webSockets: [],
  };
}

export class BrowserEvidenceProbe {
  constructor({ headless = true, channel = process.env.HERMES_BROWSER_CHANNEL ?? "chrome", settleMs = 1_000, timeoutMs = 60_000 } = {}) {
    this.headless = headless;
    this.channel = channel;
    this.settleMs = settleMs;
    this.timeoutMs = timeoutMs;
    this.browser = null;
  }

  async #browser() {
    this.browser ??= await chromium.launch({ headless: this.headless, channel: this.channel });
    return this.browser;
  }

  async inspect(url) {
    const target = new URL(url);
    if (!["http:", "https:"].includes(target.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed");
    const context = await (await this.#browser()).newContext();
    const page = await context.newPage();
    const responses = [];
    const pendingResponses = [];
    const webSockets = [];
    page.on("websocket", (socket) => webSockets.push(socket.url()));
    page.on("response", (response) => {
      const pending = response.allHeaders().then((headers) => responses.push({
        url: response.url(),
        status: response.status(),
        resourceType: response.request().resourceType(),
        contentType: headers["content-type"] ?? "",
        headers,
      })).catch(() => null);
      pendingResponses.push(pending);
    });
    try {
      await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: this.timeoutMs });
      await page.waitForTimeout(this.settleMs);
      await Promise.allSettled(pendingResponses);
      const dom = await page.evaluate(inspectDom);
      dom.webSockets = webSockets;
      return buildEvidenceProfile({ site: target.href, dom, responses });
    } finally {
      await context.close();
    }
  }

  async close() {
    await this.browser?.close();
    this.browser = null;
  }
}
