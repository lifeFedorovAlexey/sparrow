import { findFieldCandidate } from "./field-candidate.matcher.js";

export class FieldMapper {
  name = "field-mapper";

  async execute({ requestedFields, dom }) {
    const candidates = dom.primaryContainer?.fields ?? [];
    const mappings = [];
    const unmapped = [];

    for (const field of requestedFields) {
      const candidate = findFieldCandidate(field, candidates);
      if (!candidate) {
        unmapped.push(field);
        continue;
      }
      mappings.push({
        field,
        selector: candidate.selector,
        attribute: candidate.attribute,
        confidence: "high",
      });
    }

    return { mappings, unmapped };
  }
}
