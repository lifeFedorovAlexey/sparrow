import { resolve } from "node:path";

export function resolveProjectsRoot({
  configuredRoot = process.env.HERMES_PARSER_PROJECTS_ROOT,
  localAppData = process.env.LOCALAPPDATA,
  home = process.env.USERPROFILE ?? process.env.HOME,
} = {}) {
  if (configuredRoot) return resolve(configuredRoot);
  if (localAppData) return resolve(localAppData, "HermesParser", "projects");
  return resolve(home, ".hermes-parser", "projects");
}
