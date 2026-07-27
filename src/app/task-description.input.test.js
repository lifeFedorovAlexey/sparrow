import test from "node:test";
import assert from "node:assert/strict";
import { resolveTaskDescription } from "./task-description.input.js";

test("uses command-line arguments when provided", async () => {
  const description = await resolveTaskDescription({
    args: ["Собирай", "цены", "с", "https://example.com"],
    ask: async () => assert.fail("prompt must not be called"),
  });

  assert.equal(description, "Собирай цены с https://example.com");
});

test("asks interactively when npm start is called without arguments", async () => {
  const description = await resolveTaskDescription({
    args: [],
    ask: async (question) => {
      assert.match(question, /задачу/iu);
      return "Собирай товары с https://example.com";
    },
  });

  assert.equal(description, "Собирай товары с https://example.com");
});

test("rejects an empty interactive answer", async () => {
  await assert.rejects(
    () => resolveTaskDescription({ args: [], ask: async () => "   " }),
    /Описание задачи не может быть пустым/,
  );
});
