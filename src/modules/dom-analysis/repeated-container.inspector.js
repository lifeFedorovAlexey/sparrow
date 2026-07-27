import * as cheerio from "cheerio";

function stableClasses(element) {
  return String(element.attribs?.class ?? "")
    .split(/\s+/u)
    .filter((name) => name && name.length < 40 && !/[a-f\d]{8,}/iu.test(name));
}

function buildSelector(element) {
  const classes = stableClasses(element);
  if (!classes.length) return null;
  return `${element.tagName}${classes.map((name) => `.${name}`).join("")}`;
}

function discoverFields($, containerSelector) {
  const first = $(containerSelector).first();
  const selectors = [];
  const seen = new Set();

  first.find("[class]").each((_, element) => {
    const className = stableClasses(element)[0];
    if (!className) return;
    const selector = `.${className}`;
    if (seen.has(selector)) return;
    seen.add(selector);
    selectors.push({
      selector,
      attribute: element.tagName === "a" ? "href" : element.tagName === "img" ? "src" : "text",
    });
  });

  return selectors.map((field) => ({
    ...field,
    samples: $(containerSelector)
      .slice(0, 3)
      .map((_, container) => {
        const match = $(container).find(field.selector).first();
        return field.attribute === "text" ? match.text().trim() : String(match.attr(field.attribute) ?? "");
      })
      .get(),
  }));
}

export function inspectRepeatedContainers(html) {
  const $ = cheerio.load(html);
  const candidates = [];
  const seen = new Set();

  $("article[class], li[class], tr[class], div[class]").each((_, element) => {
    const selector = buildSelector(element);
    if (!selector || seen.has(selector)) return;
    seen.add(selector);
    const count = $(selector).length;
    if (count < 2) return;
    const fields = discoverFields($, selector);
    if (!fields.length) return;
    candidates.push({ selector, count, fields });
  });

  return candidates.sort((left, right) => right.count * right.fields.length - left.count * left.fields.length);
}
