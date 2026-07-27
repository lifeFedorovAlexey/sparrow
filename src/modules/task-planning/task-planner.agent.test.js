import test from "node:test";
import assert from "node:assert/strict";
import { TaskPlanner } from "./task-planner.agent.js";

test("TaskPlanner converts a Russian request into a formal scraping task", async () => {
  const planner = new TaskPlanner();
  const result = await planner.execute({
    description: "Хочу каждые 30 минут получать цены и остатки с https://example.com/catalog в Telegram через браузер с прокси.",
  });

  assert.deepEqual(result, {
    url: "https://example.com/catalog",
    schedule: { kind: "interval", everyMinutes: 30 },
    fields: ["price", "stock"],
    output: { kind: "telegram" },
    constraints: {
      authorization: false,
      proxy: true,
      javascript: true,
      browserRequired: true,
    },
    sourceDescription: "Хочу каждые 30 минут получать цены и остатки с https://example.com/catalog в Telegram через браузер с прокси.",
  });
});

test("TaskPlanner rejects a task without a URL", async () => {
  const planner = new TaskPlanner();
  await assert.rejects(
    planner.execute({ description: "Собирай цены каждый час" }),
    /URL/i,
  );
});

test("TaskPlanner refuses to generate a project when requested fields were not understood", async () => {
  const planner = new TaskPlanner();
  await assert.rejects(
    planner.execute({ description: "Собирай чемпионов и винрейты с https://wildriftallstats.ru в JSON" }),
    /Could not identify requested fields/,
  );
});
