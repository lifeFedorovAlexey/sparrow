import {
  parseConstraints,
  parseFields,
  parseOutput,
  parseSchedule,
  parseUrl,
} from "./task-description.parser.js";

export class TaskPlanner {
  name = "task-planner";

  async execute({ description }) {
    const sourceDescription = String(description ?? "").trim();
    const url = parseUrl(sourceDescription);
    if (!url) throw new Error("Task description must contain a valid URL");
    const fields = parseFields(sourceDescription);
    if (!fields.length) throw new Error("Could not identify requested fields; AI Task Planner is required");

    return {
      url,
      schedule: parseSchedule(sourceDescription),
      fields,
      output: parseOutput(sourceDescription),
      constraints: parseConstraints(sourceDescription),
      sourceDescription,
    };
  }
}
