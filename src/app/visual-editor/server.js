import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VisualBrowserController } from "../../infrastructure/browser/visual-browser.controller.js";
import { ProjectGenerator } from "../../modules/project-generation/project-generator.agent.js";
import { resolveProjectsRoot } from "../../infrastructure/storage/projects-root.js";

const publicRoot = join(dirname(fileURLToPath(import.meta.url)), "public");
const browser = new VisualBrowserController();
const generator = new ProjectGenerator({ projectsRoot: resolveProjectsRoot() });
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
  if (request.url === "/api/generate" && request.method === "POST") {
    const { schema } = browser.snapshot();
    if (!schema?.fields.length) throw new Error("Добавьте хотя бы одно поле");
    const project = await generator.execute({
      projectName: new URL(schema.url).hostname,
      task: { url: schema.url },
      containerSelector: schema.containerSelector,
      mappings: schema.fields.map((field) => ({ field: field.name, selector: field.selector, attribute: field.attribute })),
    });
    return send(response, 200, project);
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
