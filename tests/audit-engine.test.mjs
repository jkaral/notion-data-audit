import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

const { auditWorkspace } = await vite.ssrLoadModule("/lib/audit.ts");
const { demoSnapshot } = await vite.ssrLoadModule("/lib/demo-data.ts");

function clone(value) {
  return structuredClone(value);
}

test("demo audit produces the expected transparent score", () => {
  const result = auditWorkspace(demoSnapshot);
  assert.equal(result.score, 70);
  assert.equal(result.deductions, 30);
});

test("demo audit scans every supplied page and property", () => {
  const result = auditWorkspace(demoSnapshot);
  assert.equal(result.scannedPages, 12);
  assert.equal(result.scannedProperties, 6);
});

test("findings are sorted by severity", () => {
  const result = auditWorkspace(demoSnapshot);
  assert.deepEqual(
    result.findings.map((finding) => finding.severity),
    ["critical", "critical", "warning", "warning", "warning", "opportunity"],
  );
});

test("missing property descriptions include a safe preview", () => {
  const result = auditWorkspace(demoSnapshot);
  const finding = result.findings.find((item) => item.ruleId === "AUDIT-CLARITY-001");
  assert.ok(finding);
  assert.equal(finding.evidence.length, 2);
  assert.match(finding.preview.after, /responsible/);
});

test("duplicate option labels are normalized across punctuation", () => {
  const result = auditWorkspace(demoSnapshot);
  const finding = result.findings.find((item) => item.ruleId === "AUDIT-CONSISTENCY-003");
  assert.ok(finding);
  assert.match(finding.evidence[0], /In progress.*In-progress/);
});

test("duplicate page titles ignore case and punctuation", () => {
  const result = auditWorkspace(demoSnapshot);
  const finding = result.findings.find((item) => item.ruleId === "AUDIT-UNIQUE-004");
  assert.ok(finding);
  assert.match(finding.evidence[0], /Mobile onboarding/);
  assert.match(finding.evidence[0], /mobile-onboarding/);
});

test("completeness at or above forty percent is critical", () => {
  const result = auditWorkspace(demoSnapshot);
  const ownerFinding = result.findings.find((item) => item.id === "missing-owner");
  assert.equal(ownerFinding?.severity, "critical");
});

test("completeness below twenty-five percent passes", () => {
  const snapshot = clone(demoSnapshot);
  snapshot.pages.forEach((page, index) => {
    page.properties.Owner = index < 2 ? null : "Assigned";
  });
  const result = auditWorkspace(snapshot);
  assert.equal(result.findings.some((item) => item.id === "missing-owner"), false);
  assert.equal(result.passedChecks.some((item) => item.id === "complete-owner"), true);
});

test("a clean minimal data source scores one hundred", () => {
  const snapshot = {
    sourceId: "clean",
    sourceName: "Clean source",
    scannedAt: "2026-09-01T00:00:00.000Z",
    properties: [
      { id: "title", name: "Name", type: "title", description: "Page name" },
      { id: "status", name: "Status", type: "status", description: "Workflow stage", options: ["Ready", "Done"] },
    ],
    pages: [
      { id: "one", title: "One", lastEdited: "2026-08-31T00:00:00.000Z", properties: { Status: "Ready" } },
      { id: "two", title: "Two", lastEdited: "2026-08-30T00:00:00.000Z", properties: { Status: "Done" } },
    ],
  };
  const result = auditWorkspace(snapshot);
  assert.equal(result.score, 100);
  assert.equal(result.findings.length, 0);
});

test("the score never falls below zero", () => {
  const snapshot = clone(demoSnapshot);
  for (let index = 0; index < 30; index += 1) {
    snapshot.properties.push({
      id: `missing-${index}`,
      name: `Missing owner ${index}`,
      type: "people",
      description: null,
    });
  }
  const result = auditWorkspace(snapshot);
  assert.equal(result.score, 0);
});

test("audit results preserve the source name and scan time", () => {
  const result = auditWorkspace(demoSnapshot);
  assert.equal(result.sourceName, demoSnapshot.sourceName);
  assert.equal(result.scannedAt, demoSnapshot.scannedAt);
});
