import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

function defaultRegistryPath() {
  const base = process.env.LOCALAPPDATA ?? process.env.USERPROFILE ?? process.env.HOME;
  return join(base, "HermesParser", "configurations.json");
}

export class VisualSchemaRepository {
  constructor({ registryPath = defaultRegistryPath() } = {}) {
    this.registryPath = resolve(registryPath);
  }

  async list() {
    try {
      const registry = JSON.parse(await readFile(this.registryPath, "utf8"));
      return registry.configurations ?? [];
    } catch (error) {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  }

  async find(id) {
    return (await this.list()).find((item) => item.id === id) ?? null;
  }

  async save(schema) {
    if (!schema?.containerSelector || !schema.fields?.length) throw new Error("Схема не размечена");
    const id = createHash("sha256").update(JSON.stringify(schema)).digest("hex").slice(0, 16);
    const configurations = (await this.list()).filter((item) => item.id !== id);
    const saved = { id, savedAt: new Date().toISOString(), schema };
    configurations.push(saved);
    await mkdir(dirname(this.registryPath), { recursive: true });
    const temporaryPath = `${this.registryPath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify({ version: 1, configurations }, null, 2), "utf8");
    await rename(temporaryPath, this.registryPath);
    return saved;
  }
}
