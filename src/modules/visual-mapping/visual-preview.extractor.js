import * as cheerio from "cheerio";

function readValue($, container, field) {
  const element = field.selector === ":scope" ? $(container) : $(container).find(field.selector).first();
  if (field.attribute === "text" || !field.attribute) return element.text().trim();
  return String(element.attr(field.attribute) ?? "");
}

export function extractPreview(html, schema) {
  const $ = cheerio.load(html);
  return $(schema.containerSelector)
    .map((_, container) => Object.fromEntries(
      schema.fields.map((field) => [field.name, readValue($, container, field)]),
    ))
    .get();
}
