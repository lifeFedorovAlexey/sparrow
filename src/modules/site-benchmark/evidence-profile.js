const claimKeys = [
  "applicationType", "framework", "transports", "listPatterns",
  "locatorTypes", "obstacles", "protections",
];

function validateClaim(claim, path) {
  if (!claim || typeof claim.value !== "string") throw new Error(`${path} must contain a value`);
  if (claim.value !== "unknown" && (!Array.isArray(claim.evidence) || claim.evidence.length === 0)) {
    throw new Error(`${path} requires evidence`);
  }
  for (const item of claim.evidence ?? []) {
    if (!item.kind || !item.detail || !item.source) throw new Error(`${path} contains incomplete evidence`);
  }
}

export function validateEvidenceProfile(profile) {
  if (!profile?.site) throw new Error("Profile site is required");
  for (const key of claimKeys) {
    const value = profile[key];
    if (value === undefined) continue;
    const claims = Array.isArray(value) ? value : [value];
    claims.forEach((claim, index) => validateClaim(claim, `${key}[${index}]`));
  }
  return Object.freeze(structuredClone(profile));
}
