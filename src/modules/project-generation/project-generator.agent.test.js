import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ProjectGenerator } from "./project-generator.agent.js";

test("generates a modular runnable Node parser project", async () => {
  const root = await mkdtemp(join(tmpdir(), "hermes-generator-"));
  const generator = new ProjectGenerator({ projectsRoot: root });

  const result = await generator.execute({
    projectName: "Example Prices",
    task: { url: "https://example.com/catalog", output: { kind: "json" } },
    containerSelector: "article.product-card",
    mappings: [
      { field: "title", selector: ".title", attribute: "text" },
      { field: "price", selector: ".price", attribute: "text" },
    ],
  });

  assert.equal(result.projectId, "example-prices");
  assert.deepEqual(result.files, ["Dockerfile", "README.md", "package.json", "src/cli.js", "src/config.js", "src/parser.js"]);
  const config = await readFile(join(result.projectPath, "src/config.js"), "utf8");
  assert.match(config, /article\.product-card/u);
  assert.match(config, /\.price/u);
  const packageJson = JSON.parse(await readFile(join(result.projectPath, "package.json"), "utf8"));
  assert.equal(packageJson.scripts.start, "node src/cli.js");
  assert.equal(packageJson.dependencies.cheerio, "^1.1.2");
});

test("sanitizes project names used as directory names", async () => {
  const root = await mkdtemp(join(tmpdir(), "hermes-generator-"));
  const generator = new ProjectGenerator({ projectsRoot: root });
  const result = await generator.execute({
    projectName: "../../Unsafe Project",
    task: { url: "https://example.com", output: { kind: "json" } },
    containerSelector: ".item",
    mappings: [{ field: "title", selector: ".title", attribute: "text" }],
  });
  assert.equal(result.projectId, "unsafe-project");
  assert.equal(result.projectPath.startsWith(root), true);
});
