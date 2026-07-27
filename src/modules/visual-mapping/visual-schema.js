function freezeSchema(schema) {
  return Object.freeze({ ...schema, fields: Object.freeze([...schema.fields]) });
}

export function createVisualSchema(url) {
  const target = new URL(url);
  if (!["http:", "https:"].includes(target.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed");
  return freezeSchema({ version: 1, url: target.href, containerSelector: null, fields: [] });
}

export function selectContainer(schema, selector) {
  if (!String(selector ?? "").trim()) throw new Error("Container selector is required");
  return freezeSchema({ ...schema, containerSelector: selector.trim(), fields: [] });
}

export function addField(schema, field) {
  const name = String(field.name ?? "").trim();
  const selector = String(field.selector ?? "").trim();
  if (!name) throw new Error("Field name is required");
  if (!selector) throw new Error("Field selector is required");
  if (!schema.containerSelector) throw new Error("Select a repeated container first");
  if (schema.fields.some((item) => item.name === name)) throw new Error(`Field '${name}' already exists`);
  return freezeSchema({
    ...schema,
    fields: [...schema.fields, { name, selector, matchIndex: Number(field.matchIndex ?? 0), attribute: field.attribute ?? "text" }],
  });
}
