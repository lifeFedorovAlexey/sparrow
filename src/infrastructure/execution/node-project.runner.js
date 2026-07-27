import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { performance } from "node:perf_hooks";

function execute(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, NO_COLOR: "1" }, shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => resolve({ exitCode: 1, stdout, stderr: error.message }));
    child.on("close", (exitCode) => resolve({ exitCode: exitCode ?? 1, stdout, stderr }));
  });
}

async function ensureDependencies(projectPath) {
  try {
    await access(join(projectPath, "node_modules", "cheerio", "package.json"));
    return { exitCode: 0 };
  } catch {
    const npmCli = process.env.npm_execpath ?? join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
    return execute(process.execPath, [npmCli, "install", "--ignore-scripts", "--no-audit", "--no-fund"], projectPath);
  }
}

export async function runNodeProject(projectPath) {
  const startedAt = performance.now();
  const installation = await ensureDependencies(projectPath);
  if (installation.exitCode !== 0) {
    return { ...installation, stdout: "", durationMs: Math.round(performance.now() - startedAt) };
  }
  const execution = await execute(process.execPath, ["src/cli.js"], projectPath);
  return { ...execution, durationMs: Math.round(performance.now() - startedAt) };
}
