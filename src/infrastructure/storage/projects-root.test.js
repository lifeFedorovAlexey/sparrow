import test from "node:test";
import assert from "node:assert/strict";
import { resolveProjectsRoot } from "./projects-root.js";

test("stores generated parsers outside the source repository", () => {
  const root = resolveProjectsRoot({ localAppData: "C:/Users/test/AppData/Local", home: "C:/Users/test" });
  assert.equal(root.replaceAll("\\", "/"), "C:/Users/test/AppData/Local/HermesParser/projects");
});

test("honors an explicit data directory", () => {
  const root = resolveProjectsRoot({ configuredRoot: "D:/parser-output", localAppData: "ignored", home: "ignored" });
  assert.equal(root.replaceAll("\\", "/"), "D:/parser-output");
});
