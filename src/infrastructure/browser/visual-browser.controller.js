import { chromium } from "playwright-core";
import { createVisualSchema, selectContainer, addField } from "../../modules/visual-mapping/visual-schema.js";
import { installVisualOverlay } from "./visual-overlay.js";

export class VisualBrowserController {
  constructor({ headless = false, channel = process.env.HERMES_BROWSER_CHANNEL ?? "chrome" } = {}) {
    this.headless = headless;
    this.channel = channel;
    this.browser = null;
    this.page = null;
    this.schema = null;
    this.preview = [];
    this.message = "Откройте сайт";
  }

  async open(url) {
    await this.close();
    this.schema = createVisualSchema(url);
    this.preview = [];
    this.browser = await chromium.launch({ channel: this.channel, headless: this.headless });
    const context = await this.browser.newContext({ viewport: null });
    this.page = await context.newPage();
    await this.page.exposeBinding("hermesSelect", (_, selection) => this.applySelection(selection));
    await this.page.addInitScript(installVisualOverlay);
    await this.page.goto(this.schema.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    this.message = "Выберите повторяющийся блок в открытом браузере";
    return this.snapshot();
  }

  async applySelection(selection) {
    if (selection.type === "container") {
      if (selection.count < 2) throw new Error("Выбранный блок не повторяется");
      this.schema = selectContainer(this.schema, selection.selector);
    } else if (selection.type === "field") {
      this.schema = addField(this.schema, selection);
    }
    await this.refreshPreview();
    this.message = selection.type === "container" ? "Теперь добавьте поля" : `Добавлено поле: ${selection.name}`;
    return this.snapshot();
  }

  async refreshPreview() {
    const schema = this.schema;
    this.preview = await this.page.$$eval(schema.containerSelector, (containers, fields) => containers.map((container) => Object.fromEntries(fields.map((field) => {
      const element = field.selector === ":scope" ? container : container.querySelector(field.selector);
      const value = field.attribute === "text" ? element?.textContent?.trim() ?? "" : element?.getAttribute(field.attribute) ?? "";
      return [field.name, value];
    }))), schema.fields);
  }

  snapshot() {
    return { schema: this.schema, preview: this.preview.slice(0, 20), total: this.preview.length, message: this.message };
  }

  async close() {
    if (this.browser) await this.browser.close().catch(() => {});
    this.browser = null;
    this.page = null;
  }
}
