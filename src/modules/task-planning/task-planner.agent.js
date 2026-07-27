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

    return {
      url,
      schedule: parseSchedule(sourceDescription),
      fields: parseFields(sourceDescription),
      output: parseOutput(sourceDescription),
      constraints: parseConstraints(sourceDescription),
      sourceDescription,
    };
  }
}
