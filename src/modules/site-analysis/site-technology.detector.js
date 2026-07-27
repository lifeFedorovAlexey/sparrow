export function detectApplication(evidence) {
  const headers = Object.entries(evidence.headers ?? {})
    .map(([key, value]) => `${key}:${value}`)
    .join(" ")
    .toLowerCase();
  const html = String(evidence.html ?? "").toLowerCase();

  if (headers.includes("next.js") || html.includes("__next")) return "nextjs";
  if (headers.includes("nuxt") || html.includes("__nuxt")) return "nuxt";
  if (html.includes("ng-version")) return "angular";
  if (html.includes("data-v-") || html.includes("vue")) return "vue";
  if (html.includes("data-reactroot") || html.includes("react")) return "react";
  return "unknown";
}

export function detectRendering(application, evidence) {
  if (evidence.rendering) return evidence.rendering;
  if (["nextjs", "nuxt"].includes(application)) return "ssr";
  if (["react", "vue", "angular"].includes(application)) return "spa";
  return "html";
}
