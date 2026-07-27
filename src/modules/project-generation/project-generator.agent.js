import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderProjectFiles } from "./project-template.renderer.js";

function toProjectId(name) {
  const id = String(name ?? "parser-project")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase();
  return id || "parser-project";
}

export class ProjectGenerator {
  name = "project-generator";

  constructor({ projectsRoot }) {
    this.projectsRoot = resolve(projectsRoot);
  }

  async execute(input) {
    const projectId = toProjectId(input.projectName);
    const projectPath = resolve(this.projectsRoot, projectId);
    if (!projectPath.startsWith(`${this.projectsRoot}\\`) && projectPath !== this.projectsRoot) {
      throw new Error("Generated project path escaped projects root");
    }
    const files = renderProjectFiles({ ...input, projectId });
    for (const [relativePath, content] of files) {
      const destination = resolve(projectPath, relativePath);
      await mkdir(resolve(destination, ".."), { recursive: true });
      await writeFile(destination, content, "utf8");
    }
    return { projectId, projectPath, files: [...files.keys()].sort() };
  }
}
