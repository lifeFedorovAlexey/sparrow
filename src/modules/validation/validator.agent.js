function duplicateCount(records) {
  const seen = new Set();
  let duplicates = 0;
  for (const record of records) {
    const key = JSON.stringify(record);
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  return duplicates;
}

function countEmptyFields(records, fields) {
  return Object.fromEntries(fields
    .map((field) => [field, records.filter((record) => record[field] == null || String(record[field]).trim() === "").length])
    .filter(([, count]) => count > 0));
}

export class Validator {
  name = "validator";

  constructor({ runner }) {
    this.runner = runner;
  }

  async execute({ projectPath, requiredFields }) {
    const execution = await this.runner(projectPath);
    if (execution.exitCode !== 0) {
      return { valid: false, itemCount: 0, duplicateCount: 0, emptyFields: {}, durationMs: execution.durationMs, errors: [execution.stderr || `Parser exited with code ${execution.exitCode}`] };
    }

    let records;
    try {
      records = JSON.parse(execution.stdout);
      if (!Array.isArray(records)) throw new Error("Parser output must be a JSON array");
    } catch (error) {
      return { valid: false, itemCount: 0, duplicateCount: 0, emptyFields: {}, durationMs: execution.durationMs, errors: [error.message] };
    }

    const emptyFields = countEmptyFields(records, requiredFields);
    const duplicates = duplicateCount(records);
    const errors = [];
    if (!records.length) errors.push("Parser returned no records");
    if (Object.keys(emptyFields).length) errors.push("Parser returned empty required fields");
    if (duplicates) errors.push("Parser returned duplicate records");
    return { valid: errors.length === 0, itemCount: records.length, duplicateCount: duplicates, emptyFields, durationMs: execution.durationMs, errors };
  }
}
