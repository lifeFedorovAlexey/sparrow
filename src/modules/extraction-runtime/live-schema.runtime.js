export class LiveSchemaRuntime {
  async execute(page, schema) {
    if (!schema?.containerSelector) return [];
    return page.$$eval(schema.containerSelector, (containers, fields) => containers.map((container) => Object.fromEntries(fields.map((field) => {
      const element = field.selector === ":scope" ? container : container.querySelector(field.selector);
      if (!element) return [field.name, { status: "missing", value: null }];
      const value = field.attribute === "text" ? element.textContent?.trim() ?? "" : element.getAttribute(field.attribute);
      return [field.name, value];
    }))), schema.fields);
  }
}
