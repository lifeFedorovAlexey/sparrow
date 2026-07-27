const API_REFERENCE = /(?:fetch\(|axios\.(?:get|post)\(|url\s*:)[\s"'`]*(\/[^"'`\s)]+)/giu;

function detectEndpointKind(url) {
  if (/graphql/iu.test(url)) return "graphql";
  if (/\.json(?:[?#]|$)/iu.test(url)) return "json";
  return "rest";
}

export function extractEndpoints(html, baseUrl) {
  const endpoints = [];
  const seen = new Set();
  for (const match of html.matchAll(API_REFERENCE)) {
    const url = new URL(match[1], baseUrl).toString();
    if (seen.has(url)) continue;
    seen.add(url);
    endpoints.push({ url, kind: detectEndpointKind(url) });
  }
  return endpoints;
}

export function detectPagination(urls, html) {
  const source = `${urls.join(" ")} ${html}`;
  if (/[?&]page=/iu.test(source)) return { kind: "page", parameter: "page" };
  if (/[?&]offset=/iu.test(source)) return { kind: "offset", parameter: "offset" };
  if (/[?&](?:cursor|after)=/iu.test(source)) {
    return { kind: "cursor", parameter: /[?&]after=/iu.test(source) ? "after" : "cursor" };
  }
  if (/load\s*more/iu.test(source)) return { kind: "load-more" };
  if (/infinite\s*scroll|intersectionobserver/iu.test(source)) return { kind: "infinite-scroll" };
  return { kind: "unknown" };
}

export function detectObstacles(headers, html, status) {
  const obstacles = [];
  if (/cloudflare/iu.test(headers.server ?? "") || /cf-ray/iu.test(Object.keys(headers).join(" "))) obstacles.push("cloudflare");
  if (/captcha|hcaptcha|recaptcha/iu.test(html)) obstacles.push("captcha");
  if ([401, 403].includes(status) || /login|sign[ -]?in/iu.test(html)) obstacles.push("authorization");
  return obstacles;
}
