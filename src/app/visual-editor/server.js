import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VisualBrowserController } from "../../infrastructure/browser/visual-browser.controller.js";
import { VisualSchemaRepository } from "../../infrastructure/storage/visual-schema.repository.js";

const publicRoot = join(dirname(fileURLToPath(import.meta.url)), "public");
const schemas = new VisualSchemaRepository();
const browser = new VisualBrowserController({ onConfirm: (schema) => schemas.save(schema) });
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 100_000) throw new Error("Request is too large");
  }
  return JSON.parse(body || "{}");
}

function send(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

async function route(request, response) {
  if (request.url === "/api/open" && request.method === "POST") return send(response, 200, await browser.open((await readJson(request)).url));
  if (request.url === "/api/session") return send(response, 200, browser.snapshot());
  if (request.url === "/api/configurations") return send(response, 200, await schemas.list());
  if (request.url === "/api/save" && request.method === "POST") {
    const { schema } = browser.snapshot();
    if (!schema?.fields.length) throw new Error("Добавьте хотя бы одно поле");
    return send(response, 200, await schemas.save(schema));
  }
  if (request.url === "/api/run" && request.method === "POST") {
    const configuration = await schemas.find((await readJson(request)).id);
    if (!configuration) throw new Error("Конфигурация не найдена");
    return send(response, 200, await browser.executeSchema(configuration.schema));
  }
  const path = request.url === "/" ? "/index.html" : request.url;
  const destination = join(publicRoot, path);
  if (!destination.startsWith(publicRoot)) return send(response, 403, { error: "Forbidden" });
  const extension = path.slice(path.lastIndexOf("."));
  const content = await readFile(destination);
  response.writeHead(200, { "content-type": mime[extension] ?? "application/octet-stream" });
  response.end(content);
}

const server = createServer((request, response) => route(request, response).catch((error) => send(response, 400, { error: error.message })));
const port = Number(process.env.PORT ?? 4310);
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.log(`Hermes Visual Parser уже запущен: http://127.0.0.1:${port}`);
    return;
  }
  console.error(`Не удалось запустить Hermes Visual Parser: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => console.log(`Hermes Visual Parser: http://127.0.0.1:${port}`));
process.on("SIGINT", async () => { await browser.close(); server.close(); });
