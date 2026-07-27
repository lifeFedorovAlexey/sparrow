import { chromium } from "playwright-core";
import { createVisualSchema, selectContainer, addField } from "../../modules/visual-mapping/visual-schema.js";
import { installVisualOverlay } from "./visual-overlay.js";
import { LiveSchemaRuntime } from "../../modules/extraction-runtime/live-schema.runtime.js";
import { installInterferenceMitigator } from "./interference-mitigator.js";

export class VisualBrowserController {
  constructor({ headless = false, channel = process.env.HERMES_BROWSER_CHANNEL ?? "chrome", runtime = new LiveSchemaRuntime(), onConfirm = async () => null } = {}) {
    this.headless = headless;
    this.channel = channel;
    this.runtime = runtime;
    this.onConfirm = onConfirm;
    this.browser = null;
    this.page = null;
    this.schema = null;
    this.preview = [];
    this.message = "Откройте сайт";
    this.interference = [];
  }

  async open(url) {
    await this.close();
    this.schema = createVisualSchema(url);
    this.preview = [];
    this.browser = await chromium.launch({ channel: this.channel, headless: this.headless });
    const context = await this.browser.newContext({ viewport: null });
    this.page = await context.newPage();
    await this.page.exposeBinding("hermesSelect", (_, selection) => this.applySelection(selection));
    await this.page.exposeBinding("hermesConfirm", () => this.confirm());
    await this.page.exposeBinding("hermesInterference", (_, event) => this.reportInterference(event));
    await this.page.addInitScript(installVisualOverlay);
    await this.page.goto(this.schema.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    this.message = "Выберите повторяющийся блок в открытом браузере";
    await this.page.evaluate(installInterferenceMitigator);
    return this.snapshot();
  }

  async executeSchema(schema) {
    await this.open(schema.url);
    this.schema = schema;
    await this.refreshPreview();
    this.message = `Конфигурация выполнена: ${this.preview.length} записей`;
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

  async confirm() {
    if (!this.schema?.fields.length || !this.preview.length) throw new Error("Сначала выберите поля");
    const saved = await this.onConfirm(this.schema);
    this.message = "Конфигурация подтверждена и сохранена";
    setTimeout(() => this.close(), 300);
    return saved;
  }

  reportInterference(event) {
    this.interference.push(event);
    if (event.type === "captcha") this.message = "Обнаружена CAPTCHA: решите её вручную в браузере, затем продолжайте";
    return this.snapshot();
  }

  async refreshPreview() {
    this.preview = await this.runtime.execute(this.page, this.schema);
  }

  snapshot() {
    return { schema: this.schema, preview: this.preview.slice(0, 20), total: this.preview.length, message: this.message, interference: [...this.interference] };
  }

  async close() {
    if (this.browser) await this.browser.close().catch(() => {});
    this.browser = null;
    this.page = null;
  }
}
