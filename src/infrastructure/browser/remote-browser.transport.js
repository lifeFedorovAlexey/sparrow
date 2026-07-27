export class RemoteBrowserTransport {
  constructor({ width = 1440, height = 900, quality = 70 } = {}) {
    this.width = width;
    this.height = height;
    this.quality = quality;
    this.cdp = null;
    this.latestFrame = null;
    this.sequence = 0;
  }

  async start(page) {
    await this.stop();
    this.cdp = await page.context().newCDPSession(page);
    this.cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
      this.sequence += 1;
      this.latestFrame = { data, metadata, sequence: this.sequence, mime: "image/jpeg" };
      void this.cdp?.send("Page.screencastFrameAck", { sessionId });
    });
    await this.cdp.send("Page.enable");
    await this.cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: this.quality,
      maxWidth: this.width,
      maxHeight: this.height,
      everyNthFrame: 1,
    });
  }

  frame() {
    return this.latestFrame;
  }

  async input(event) {
    if (!this.cdp) throw new Error("Remote browser stream is not active");
    if (event.type === "text") return this.cdp.send("Input.insertText", { text: String(event.text ?? "") });
    if (event.type === "key") {
      await this.cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: event.key, code: event.code ?? event.key });
      return this.cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: event.key, code: event.code ?? event.key });
    }
    const width = Number(event.viewportWidth || this.width);
    const height = Number(event.viewportHeight || this.height);
    const x = Math.max(0, Math.min(1, Number(event.x))) * width;
    const y = Math.max(0, Math.min(1, Number(event.y))) * height;
    if (event.type === "move") return this.cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    if (event.type === "scroll") return this.cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: Number(event.deltaX ?? 0), deltaY: Number(event.deltaY ?? 0) });
    if (event.type === "click") {
      await this.cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      return this.cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    }
    throw new Error(`Unsupported remote input type: ${event.type}`);
  }

  async stop() {
    if (this.cdp) await this.cdp.send("Page.stopScreencast").catch(() => {});
    this.cdp = null;
    this.latestFrame = null;
    this.sequence = 0;
  }
}
