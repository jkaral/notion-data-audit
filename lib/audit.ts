export type PropertyType =
  | "title"
  | "rich_text"
  | "status"
  | "select"
  | "multi_select"
  | "people"
  | "date"
  | "number"
  | "checkbox"
  | "relation"
  | "unknown";

export type CellValue = string | number | boolean | string[] | null;

export interface WorkspaceProperty {
  id: string;
  name: string;
  type: PropertyType;
  description?: string | null;
  options?: string[];
}

export interface WorkspacePage {
  id: string;
  title: string;
  lastEdited: string;
  properties: Record<string, CellValue>;
}

export interface WorkspaceSnapshot {
  sourceId: string;
  sourceName: string;
  scannedAt: string;
  properties: WorkspaceProperty[];
  pages: WorkspacePage[];
}

export type FindingSeverity = "critical" | "warning" | "opportunity";
export type FindingCategory =
  | "Completeness"
  | "Clarity"
  | "Consistency"
  | "Freshness"
  | "Uniqueness";

export interface FixPreview {
  label: string;
  before: string;
  after: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  summary: string;
  entityName: string;
  evidence: string[];
  impact: string;
  recommendation: string;
  deduction: number;
  preview?: FixPreview;
}

export interface PassedCheck {
  id: string;
  title: string;
  detail: string;
}

export interface AuditResult {
  score: number;
  sourceName: string;
  scannedAt: string;
  scannedPages: number;
  scannedProperties: number;
  findings: Finding[];
  passedChecks: PassedCheck[];
  deductions: number;
}

const severityOrder: Record<FindingSeverity, number> = {
  critical: 0,
  warning: 1,
  opportunity: 2,
};

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isMissing(value: CellValue | undefined) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function cellFor(page: WorkspacePage, propertyName: string) {
  if (propertyName in page.properties) return page.properties[propertyName];
  const match = Object.keys(page.properties).find(
    (key) => key.toLocaleLowerCase() === propertyName.toLocaleLowerCase(),
  );
  return match ? page.properties[match] : undefined;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function propertyDescriptionSuggestion(property: WorkspaceProperty) {
  const descriptions: Record<PropertyType, string> = {
    title: "The clear, human-readable name of this item.",
    rich_text: "A short summary that gives teammates and AI tools the needed context.",
    status: "The current workflow stage for this item.",
    select: "The single category used to group and prioritize this item.",
    multi_select: "The tags used to classify this item across multiple dimensions.",
    people: "The person directly responsible for moving this item forward.",
    date: "The target date for completing or reviewing this item.",
    number: "The numeric value used to measure or compare this item.",
    checkbox: "Whether this item has met the defined condition.",
    relation: "The related record that provides additional context for this item.",
    unknown: "The purpose of this property and how teammates should use it.",
  };
  return descriptions[property.type];
}

export function auditWorkspace(snapshot: WorkspaceSnapshot): AuditResult {
  const findings: Finding[] = [];
  const passedChecks: PassedCheck[] = [];

  const undocumented = snapshot.properties.filter(
    (property) => property.type !== "title" && !property.description?.trim(),
  );
  if (undocumented.length > 0) {
    const first = undocumented[0];
    findings.push({
      id: "schema-missing-descriptions",
      ruleId: "AUDIT-CLARITY-001",
      severity: "warning",
      category: "Clarity",
      title: `${undocumented.length} properties need a description`,
      summary: `“${undocumented.map((item) => item.name).join("”, “")}” do not explain what belongs in them.`,
      entityName: first.name,
      evidence: undocumented.map(
        (item) => `${item.name} · ${item.type.replaceAll("_", " ")} · no description`,
      ),
      impact:
        "People—and AI tools—have to guess what these fields mean, which makes generated answers less reliable.",
      recommendation:
        "Add one plain-language sentence to each property before using the database as AI context.",
      deduction: 4,
      preview: {
        label: `Suggested description for ${first.name}`,
        before: "No description",
        after: propertyDescriptionSuggestion(first),
      },
    });
  } else {
    passedChecks.push({
      id: "descriptions-present",
      title: "Every working property is documented",
      detail: "Each non-title property has a description.",
    });
  }

  const completenessTypes = new Set<PropertyType>(["status", "people", "date"]);
  for (const property of snapshot.properties.filter((item) => completenessTypes.has(item.type))) {
    if (snapshot.pages.length === 0) continue;
    const missingPages = snapshot.pages.filter((page) => isMissing(cellFor(page, property.name)));
    const ratio = missingPages.length / snapshot.pages.length;
    if (ratio >= 0.25) {
      const severe = ratio >= 0.4;
      findings.push({
        id: `missing-${normalize(property.name)}`,
        ruleId: "AUDIT-COMPLETE-002",
        severity: severe ? "critical" : "warning",
        category: "Completeness",
        title: `${percent(ratio)} of rows are missing ${property.name}`,
        summary: `${missingPages.length} of ${snapshot.pages.length} pages have an empty ${property.name} value.`,
        entityName: property.name,
        evidence: missingPages.slice(0, 4).map((page) => `${page.title} · ${property.name} is empty`),
        impact:
          property.type === "people"
            ? "Work without a clear owner is harder to route, summarize, and act on."
            : "Incomplete workflow data makes filters and AI summaries produce partial answers.",
        recommendation: `Assign ${property.name.toLocaleLowerCase()} values to the affected rows, starting with active work.`,
        deduction: severe ? 8 : 5,
      });
    } else {
      passedChecks.push({
        id: `complete-${normalize(property.name)}`,
        title: `${property.name} is consistently filled in`,
        detail: `${percent(1 - ratio)} of rows include a value.`,
      });
    }
  }

  for (const property of snapshot.properties.filter(
    (item) => (item.type === "status" || item.type === "select") && item.options,
  )) {
    const groups = new Map<string, string[]>();
    for (const option of property.options ?? []) {
      const key = normalize(option);
      groups.set(key, [...(groups.get(key) ?? []), option]);
    }
    const duplicates = [...groups.values()].filter((group) => group.length > 1);
    if (duplicates.length > 0) {
      const pair = duplicates[0];
      findings.push({
        id: `duplicate-options-${normalize(property.name)}`,
        ruleId: "AUDIT-CONSISTENCY-003",
        severity: "warning",
        category: "Consistency",
        title: `Overlapping ${property.name.toLocaleLowerCase()} options`,
        summary: `${pair.map((item) => `“${item}”`).join(" and ")} normalize to the same value.`,
        entityName: property.name,
        evidence: duplicates.map((group) => group.join(" ↔ ")),
        impact:
          "Two labels for the same idea split filters, charts, and AI summaries into misleading groups.",
        recommendation: `Choose one canonical label and move affected pages to it after a human review.`,
        deduction: 4,
        preview: {
          label: `Canonical ${property.name.toLocaleLowerCase()} label`,
          before: pair.join("  /  "),
          after: pair[0],
        },
      });
    }
  }

  const titleGroups = new Map<string, WorkspacePage[]>();
  for (const page of snapshot.pages.filter((item) => item.title.trim())) {
    const key = normalize(page.title);
    titleGroups.set(key, [...(titleGroups.get(key) ?? []), page]);
  }
  const duplicateTitles = [...titleGroups.values()].filter((group) => group.length > 1);
  if (duplicateTitles.length > 0) {
    findings.push({
      id: "duplicate-page-titles",
      ruleId: "AUDIT-UNIQUE-004",
      severity: "critical",
      category: "Uniqueness",
      title: `${duplicateTitles.length} duplicate title group${duplicateTitles.length === 1 ? "" : "s"}`,
      summary: "Multiple pages share titles that become identical after punctuation and capitalization are removed.",
      entityName: duplicateTitles[0][0].title,
      evidence: duplicateTitles.slice(0, 4).map(
        (group) => `${group.map((page) => `“${page.title}”`).join(" and ")} · ${group.length} pages`,
      ),
      impact:
        "Humans and AI retrieval can select the wrong page when names do not uniquely identify the work.",
      recommendation: "Add a team, quarter, or version to each title so every page is unambiguous.",
      deduction: 6,
    });
  } else {
    passedChecks.push({
      id: "titles-unique",
      title: "Page titles are unique",
      detail: "No normalized duplicate titles were found.",
    });
  }

  const referenceTime = new Date(snapshot.scannedAt).getTime();
  const staleCutoff = 90 * 24 * 60 * 60 * 1000;
  const stalePages = snapshot.pages.filter((page) => {
    const edited = new Date(page.lastEdited).getTime();
    return Number.isFinite(edited) && referenceTime - edited > staleCutoff;
  });
  if (stalePages.length > 0) {
    findings.push({
      id: "stale-pages",
      ruleId: "AUDIT-FRESHNESS-005",
      severity: "opportunity",
      category: "Freshness",
      title: `${stalePages.length} pages may be stale`,
      summary: "These pages have not been edited in more than 90 days.",
      entityName: stalePages[0].title,
      evidence: stalePages.slice(0, 4).map(
        (page) => `${page.title} · last edited ${new Date(page.lastEdited).toLocaleDateString("en-US")}`,
      ),
      impact:
        "Old context can still look authoritative, so an AI answer may confidently use information that is no longer current.",
      recommendation: "Ask each owner to confirm, archive, or update these pages.",
      deduction: 3,
    });
  } else {
    passedChecks.push({
      id: "pages-fresh",
      title: "Recently maintained workspace",
      detail: "Every page was edited within the last 90 days.",
    });
  }

  if (snapshot.pages.length > 0) {
    passedChecks.push({
      id: "source-readable",
      title: "Data source is readable",
      detail: `${snapshot.pages.length} pages were available for inspection.`,
    });
  }
  if (snapshot.properties.some((property) => property.type === "title")) {
    passedChecks.push({
      id: "title-property",
      title: "Primary title property exists",
      detail: "Pages have a human-readable identifier.",
    });
  }
  if (snapshot.pages.every((page) => page.title.trim().length > 0)) {
    passedChecks.push({
      id: "titles-present",
      title: "No empty page titles",
      detail: "Every scanned page has a name.",
    });
  }

  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const deductions = findings.reduce((total, finding) => total + finding.deduction, 0);

  return {
    score: Math.max(0, 100 - deductions),
    sourceName: snapshot.sourceName,
    scannedAt: snapshot.scannedAt,
    scannedPages: snapshot.pages.length,
    scannedProperties: snapshot.properties.length,
    findings,
    passedChecks,
    deductions,
  };
}
