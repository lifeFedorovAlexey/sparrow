import test from "node:test";
import assert from "node:assert/strict";
import { validateEvidenceProfile } from "./evidence-profile.js";

const evidence = { kind: "dom-marker", detail: "script[src*='_next'] observed", source: "browser" };

test("accepts classifications only when every non-unknown claim has evidence", () => {
  const profile = validateEvidenceProfile({
    site: "Example",
    applicationType: { value: "hybrid", evidence: [evidence] },
    framework: { value: "nextjs", evidence: [evidence] },
    transports: [{ value: "html", evidence: [{ kind: "response", detail: "document response", source: "browser" }] }],
  });
  assert.equal(profile.framework.value, "nextjs");
});

test("rejects guessed frameworks, protections, and endpoints without observations", () => {
  assert.throws(() => validateEvidenceProfile({
    site: "Example",
    framework: { value: "nextjs", evidence: [] },
    protections: [{ value: "cloudflare", evidence: [] }],
  }), /evidence/i);
});

test("allows explicit unknown values without fabricated evidence", () => {
  const profile = validateEvidenceProfile({ site: "Blocked", framework: { value: "unknown", evidence: [] } });
  assert.equal(profile.framework.value, "unknown");
});
