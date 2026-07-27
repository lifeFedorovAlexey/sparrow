import test from "node:test";
import assert from "node:assert/strict";
import { RemoteBrowserTransport } from "./remote-browser.transport.js";

class FakeCdp {
  handlers = new Map();
  commands = [];
  on(name, handler) { this.handlers.set(name, handler); }
  async send(method, params = {}) { this.commands.push({ method, params }); }
  emit(name, value) { this.handlers.get(name)?.(value); }
}

test("streams Playwright frames and acknowledges screencast frames", async () => {
  const cdp = new FakeCdp();
  const page = { context: () => ({ newCDPSession: async () => cdp }) };
  const transport = new RemoteBrowserTransport();
  await transport.start(page);
  cdp.emit("Page.screencastFrame", { data: "jpeg-base64", metadata: { deviceWidth: 1280, deviceHeight: 720 }, sessionId: 7 });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(transport.frame().data, "jpeg-base64");
  assert.equal(transport.frame().sequence, 1);
  assert.ok(cdp.commands.some(({ method }) => method === "Page.startScreencast"));
  assert.ok(cdp.commands.some(({ method, params }) => method === "Page.screencastFrameAck" && params.sessionId === 7));
});

test("relays normalized client pointer and keyboard input through CDP", async () => {
  const cdp = new FakeCdp();
  const page = { context: () => ({ newCDPSession: async () => cdp }) };
  const transport = new RemoteBrowserTransport();
  await transport.start(page);
  await transport.input({ type: "click", x: 0.25, y: 0.5, viewportWidth: 1200, viewportHeight: 800 });
  await transport.input({ type: "text", text: "поле" });

  assert.ok(cdp.commands.some(({ method, params }) => method === "Input.dispatchMouseEvent" && params.type === "mousePressed" && params.x === 300 && params.y === 400));
  assert.ok(cdp.commands.some(({ method, params }) => method === "Input.insertText" && params.text === "поле"));
});
