import test from "node:test";
import assert from "node:assert/strict";
import { Validator } from "./validator.agent.js";

test("accepts a generated parser that returns populated unique records", async () => {
  const validator = new Validator({ runner: async () => ({
    exitCode: 0,
    stdout: JSON.stringify([
      { title: "Alpha", price: "100 ₽" },
      { title: "Beta", price: "200 ₽" },
    ]),
    stderr: "",
    durationMs: 42,
  }) });

  const report = await validator.execute({ projectPath: "generated/project", requiredFields: ["title", "price"] });
  assert.equal(report.valid, true);
  assert.equal(report.itemCount, 2);
  assert.equal(report.duplicateCount, 0);
  assert.deepEqual(report.emptyFields, {});
});

test("rejects parser failures and malformed output", async () => {
  const validator = new Validator({ runner: async () => ({ exitCode: 1, stdout: "", stderr: "boom", durationMs: 10 }) });
  const report = await validator.execute({ projectPath: "generated/project", requiredFields: ["price"] });
  assert.equal(report.valid, false);
  assert.match(report.errors[0], /boom/u);
});

test("reports empty fields and duplicate records", async () => {
  const validator = new Validator({ runner: async () => ({
    exitCode: 0,
    stdout: JSON.stringify([{ title: "A", price: "" }, { title: "A", price: "" }]),
    stderr: "",
    durationMs: 8,
  }) });
  const report = await validator.execute({ projectPath: "generated/project", requiredFields: ["title", "price"] });
  assert.equal(report.valid, false);
  assert.equal(report.duplicateCount, 1);
  assert.deepEqual(report.emptyFields, { price: 2 });
});
