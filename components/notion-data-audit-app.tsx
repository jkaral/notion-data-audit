"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  Download,
  Eye,
  Info,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { auditWorkspace, type AuditResult, type Finding } from "@/lib/audit";
import { demoSnapshot } from "@/lib/demo-data";

type Filter = "all" | "critical" | "warning" | "opportunity" | "passed";
type Mode = "demo" | "live";
type ScanState = "idle" | "scanning" | "success" | "error";

const initialResult = auditWorkspace(demoSnapshot);

const filters: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All findings" },
  { id: "critical", label: "Critical" },
  { id: "warning", label: "Warnings" },
  { id: "opportunity", label: "Opportunities" },
  { id: "passed", label: "Passed" },
];

const severityCopy = {
  critical: { label: "Critical", short: "Fix first" },
  warning: { label: "Warning", short: "Needs attention" },
  opportunity: { label: "Opportunity", short: "Worth reviewing" },
};

function severityIcon(severity: Finding["severity"]) {
  if (severity === "critical") return <CircleAlert aria-hidden="true" />;
  if (severity === "warning") return <AlertTriangle aria-hidden="true" />;
  return <Sparkles aria-hidden="true" />;
}

function formatScanTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function makeReport(result: AuditResult) {
  const findings = result.findings
    .map(
      (finding, index) => `## ${index + 1}. ${finding.title}\n\n- Severity: ${severityCopy[finding.severity].label}\n- Rule: ${finding.ruleId}\n- Category: ${finding.category}\n- Score deduction: -${finding.deduction}\n\n${finding.summary}\n\n**Why it matters:** ${finding.impact}\n\n**Suggested action:** ${finding.recommendation}\n\n**Evidence**\n${finding.evidence.map((item) => `- ${item}`).join("\n")}`,
    )
    .join("\n\n---\n\n");

  return `# Notion Data Audit\n\n**Data source:** ${result.sourceName}  \n**Readiness score:** ${result.score}/100  \n**Scanned:** ${result.scannedPages} pages and ${result.scannedProperties} properties  \n**Generated:** ${result.scannedAt}\n\n> Review-only report. Notion Data Audit did not change the connected workspace.\n\n${findings}`;
}

export function NotionDataAuditApp() {
  const [result, setResult] = useState(initialResult);
  const [mode, setMode] = useState<Mode>("demo");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(initialResult.findings[0]?.id ?? "");
  const [previewFinding, setPreviewFinding] = useState<Finding | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");

  const counts = useMemo(
    () => ({
      all: result.findings.length,
      critical: result.findings.filter((item) => item.severity === "critical").length,
      warning: result.findings.filter((item) => item.severity === "warning").length,
      opportunity: result.findings.filter((item) => item.severity === "opportunity").length,
      passed: result.passedChecks.length,
    }),
    [result],
  );

  const visibleFindings =
    filter === "all"
      ? result.findings
      : filter === "passed"
        ? []
        : result.findings.filter((finding) => finding.severity === filter);
  const selectedFinding =
    visibleFindings.find((finding) => finding.id === selectedId) ?? visibleFindings[0] ?? null;

  async function runAudit() {
    setScanState("scanning");
    setError("");
    setApprovedIds(new Set());

    try {
      if (mode === "demo") {
        await new Promise((resolve) => window.setTimeout(resolve, 850));
        const next = auditWorkspace({ ...demoSnapshot, scannedAt: new Date().toISOString() });
        setResult(next);
        setSelectedId(next.findings[0]?.id ?? "");
      } else {
        const response = await fetch("/api/audit", { method: "POST" });
        const payload = (await response.json()) as {
          ok?: boolean;
          result?: AuditResult;
          error?: string;
        };
        if (!response.ok || !payload.result) {
          throw new Error(payload.error || "The live audit could not be completed.");
        }
        setResult(payload.result);
        setSelectedId(payload.result.findings[0]?.id ?? "");
      }
      setFilter("all");
      setScanState("success");
      window.setTimeout(() => setScanState("idle"), 1800);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "The audit could not be completed.");
      setScanState("error");
    }
  }

  function exportReport() {
    const blob = new Blob([makeReport(result)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "notion-data-audit-report.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  function approvePreview() {
    if (!previewFinding) return;
    setApprovedIds((current) => new Set([...current, previewFinding.id]));
    setPreviewFinding(null);
  }

  const primaryFinding = selectedFinding ?? result.findings[0] ?? null;

  return (
    <div className="workspace-app">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#top" aria-label="Notion Data Audit home">
            <span className="brand-mark" aria-hidden="true">DA</span>
            <span>Notion Data Audit</span>
          </a>
          <nav className="topnav" aria-label="Primary navigation">
            <a href="#audit">Audit</a>
            <a href="#method">Method</a>
            <span className="review-pill"><Lock aria-hidden="true" /> Review only</span>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Notion internship portfolio project</p>
            <h1 id="hero-title">Make your workspace<br /><em>ready to reason.</em></h1>
            <p className="hero-description">
              Notion Data Audit inspects a Notion data source, finds structural problems,
              and shows the evidence behind every suggestion—before anything changes.
            </p>
            <div className="hero-signals" aria-label="Product principles">
              <span><ShieldCheck aria-hidden="true" /> Evidence linked</span>
              <span><Eye aria-hidden="true" /> Human reviewed</span>
              <span><Lock aria-hidden="true" /> Read only</span>
            </div>
          </div>

          <aside className="run-card" aria-label="Run an audit">
            <div className="run-card-header">
              <div>
                <p className="micro-label">AUDIT SOURCE</p>
                <h2>{mode === "demo" ? "Product roadmap" : "Your Notion data source"}</h2>
              </div>
              <span className={`connection-dot ${mode}`}><span /> {mode === "demo" ? "Demo ready" : "Server connection"}</span>
            </div>

            <div className="mode-switch" role="group" aria-label="Audit source mode">
              <button className={mode === "demo" ? "active" : ""} onClick={() => setMode("demo")} aria-pressed={mode === "demo"}>Demo workspace</button>
              <button className={mode === "live" ? "active" : ""} onClick={() => setMode("live")} aria-pressed={mode === "live"}>Live Notion</button>
            </div>

            <p className="source-description">
              {mode === "demo"
                ? "A realistic 12-page product roadmap with planted quality issues. No setup needed."
                : "Reads one data source using server-side credentials. Notion Data Audit never asks for a token in the browser."}
            </p>

            {error && <div className="inline-error" role="alert"><Info aria-hidden="true" /><span>{error}</span></div>}

            <Button className="run-button" size="lg" onClick={runAudit} disabled={scanState === "scanning"}>
              {scanState === "scanning" ? <Loader2 className="spin" aria-hidden="true" /> : scanState === "success" ? <Check aria-hidden="true" /> : <Play aria-hidden="true" />}
              {scanState === "scanning" ? "Inspecting structure…" : scanState === "success" ? "Audit complete" : "Run workspace audit"}
            </Button>
            <div className="run-meta">
              <span>{mode === "demo" ? "12 pages" : "Up to 500 pages"}</span>
              <span>5 deterministic checks</span>
              <span>0 automatic edits</span>
            </div>

            {mode === "live" && (
              <details className="setup-details">
                <summary>How to connect safely <ChevronRight aria-hidden="true" /></summary>
                <ol>
                  <li>Create an internal Notion integration.</li>
                  <li>Share only one data source with it.</li>
                  <li>Add the token and data source ID to server environment variables.</li>
                </ol>
              </details>
            )}
          </aside>
        </section>

        <section className="audit-shell" id="audit" aria-labelledby="audit-heading">
          <aside className="score-panel">
            <div className="panel-kicker"><span /> LATEST AUDIT</div>
            <div className="score-ring" style={{ background: `conic-gradient(#6b5cff ${result.score * 3.6}deg, #e8e6df 0deg)` }}>
              <div className="score-center">
                <strong>{result.score}</strong>
                <span>/ 100</span>
              </div>
            </div>
            <div className="score-copy">
              <h2>Needs attention</h2>
              <p>A usable foundation with a few gaps that could weaken AI answers.</p>
            </div>
            <Progress value={result.score} className="score-progress" aria-label={`Readiness score ${result.score} out of 100`} />

            <dl className="scan-stats">
              <div><dt>Pages inspected</dt><dd>{result.scannedPages}</dd></div>
              <div><dt>Properties mapped</dt><dd>{result.scannedProperties}</dd></div>
              <div><dt>Score deductions</dt><dd>−{result.deductions}</dd></div>
              <div><dt>Last scan</dt><dd>{formatScanTime(result.scannedAt)}</dd></div>
            </dl>

            <div className="safety-note">
              <ShieldCheck aria-hidden="true" />
              <div><strong>Nothing was changed</strong><span>This MVP only reads, explains, and previews.</span></div>
            </div>

            <Button variant="outline" className="export-button" onClick={exportReport}>
              <Download aria-hidden="true" /> Export Markdown report
            </Button>
          </aside>

          <section className="findings-panel">
            <div className="findings-header">
              <div>
                <p className="micro-label">STRUCTURE REPORT</p>
                <h2 id="audit-heading">What needs your attention</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={runAudit} disabled={scanState === "scanning"}>
                <RefreshCw className={scanState === "scanning" ? "spin" : ""} aria-hidden="true" /> Rescan
              </Button>
            </div>

            <div className="filter-row" role="tablist" aria-label="Filter audit results">
              {filters.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={filter === item.id}
                  className={filter === item.id ? "active" : ""}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}<span>{counts[item.id]}</span>
                </button>
              ))}
            </div>

            <div className="finding-list" role="tabpanel">
              {filter === "passed" ? (
                result.passedChecks.map((check) => (
                  <article className="pass-card" key={check.id}>
                    <span className="pass-icon"><Check aria-hidden="true" /></span>
                    <div><h3>{check.title}</h3><p>{check.detail}</p></div>
                  </article>
                ))
              ) : visibleFindings.length > 0 ? (
                visibleFindings.map((finding) => (
                  <button
                    className={`finding-card ${finding.severity} ${selectedFinding?.id === finding.id ? "selected" : ""}`}
                    key={finding.id}
                    onClick={() => setSelectedId(finding.id)}
                    aria-pressed={selectedFinding?.id === finding.id}
                  >
                    <span className="finding-icon">{severityIcon(finding.severity)}</span>
                    <span className="finding-body">
                      <span className="finding-topline">
                        <span className="severity-label">{severityCopy[finding.severity].label}</span>
                        <span className="rule-id">{finding.ruleId}</span>
                      </span>
                      <strong>{finding.title}</strong>
                      <span className="finding-summary">{finding.summary}</span>
                      <span className="finding-footer">
                        <span>{finding.category}</span>
                        <span>{finding.evidence.length} evidence item{finding.evidence.length === 1 ? "" : "s"}</span>
                        <span>−{finding.deduction} pts</span>
                      </span>
                    </span>
                    <ChevronRight className="finding-chevron" aria-hidden="true" />
                  </button>
                ))
              ) : (
                <div className="empty-state">
                  <Search aria-hidden="true" />
                  <h3>No findings in this category</h3>
                  <p>Try another filter or run the audit again.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="inspector-panel" aria-live="polite">
            {filter === "passed" ? (
              <div className="passed-inspector">
                <span className="large-pass"><Check aria-hidden="true" /></span>
                <p className="micro-label">VERIFIED</p>
                <h2>{result.passedChecks.length} checks passed</h2>
                <p>These parts of the data source are already structured clearly enough for reliable filtering and retrieval.</p>
              </div>
            ) : primaryFinding ? (
              <>
                <div className="inspector-header">
                  <div className={`inspector-severity ${primaryFinding.severity}`}>
                    {severityIcon(primaryFinding.severity)}
                    <span>{severityCopy[primaryFinding.severity].short}</span>
                  </div>
                  <Badge variant="outline">{primaryFinding.category}</Badge>
                </div>
                <p className="micro-label">FINDING DETAILS</p>
                <h2>{primaryFinding.title}</h2>
                <p className="inspector-summary">{primaryFinding.summary}</p>

                <div className="detail-section">
                  <h3><Search aria-hidden="true" /> Evidence</h3>
                  <ul className="evidence-list">
                    {primaryFinding.evidence.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>

                <div className="detail-section impact-section">
                  <h3><Info aria-hidden="true" /> Why it matters</h3>
                  <p>{primaryFinding.impact}</p>
                </div>

                <div className="detail-section recommendation-section">
                  <h3><Wand2 aria-hidden="true" /> Suggested next step</h3>
                  <p>{primaryFinding.recommendation}</p>
                </div>

                {primaryFinding.preview ? (
                  <Button
                    className="preview-button"
                    variant={approvedIds.has(primaryFinding.id) ? "outline" : "default"}
                    onClick={() => setPreviewFinding(primaryFinding)}
                  >
                    {approvedIds.has(primaryFinding.id) ? <Check aria-hidden="true" /> : <Eye aria-hidden="true" />}
                    {approvedIds.has(primaryFinding.id) ? "Approved for later" : "Preview safe fix"}
                  </Button>
                ) : (
                  <div className="manual-review"><Eye aria-hidden="true" /><span><strong>Manual review required</strong>Notion Data Audit will not merge or rename this automatically.</span></div>
                )}
              </>
            ) : null}
          </aside>
        </section>

        <section className="method-section" id="method" aria-labelledby="method-heading">
          <div className="method-intro">
            <p className="eyebrow"><span /> How it works</p>
            <h2 id="method-heading">A boringly transparent audit.</h2>
            <p>Each result comes from a named rule, visible evidence, and a fixed score deduction. No mystery number.</p>
          </div>
          <div className="method-steps">
            <article><span>01</span><Database aria-hidden="true" /><h3>Read one source</h3><p>Map the schema and pages the integration can access—nothing else.</p></article>
            <article><span>02</span><Search aria-hidden="true" /><h3>Run clear checks</h3><p>Inspect completeness, clarity, consistency, uniqueness, and freshness.</p></article>
            <article><span>03</span><Eye aria-hidden="true" /><h3>Show the proof</h3><p>Link each recommendation to the exact rows or properties that triggered it.</p></article>
            <article><span>04</span><ShieldCheck aria-hidden="true" /><h3>Keep a human in charge</h3><p>Preview suggestions locally. The MVP never writes back automatically.</p></article>
          </div>
        </section>
      </main>

      <footer>
        <div><span className="brand-mark small" aria-hidden="true">DA</span><strong>Notion Data Audit</strong></div>
        <p>Built by John Karakoulas · Independent portfolio project</p>
        <span>TypeScript · React · Notion API</span>
      </footer>

      <Dialog open={Boolean(previewFinding)} onOpenChange={(open) => !open && setPreviewFinding(null)}>
        <DialogContent className="fix-dialog">
          <DialogHeader>
            <div className="dialog-icon"><Wand2 aria-hidden="true" /></div>
            <DialogTitle>Preview—not an automatic edit</DialogTitle>
            <DialogDescription>
              Review the proposed change. Approving it only records your decision in this browser session.
            </DialogDescription>
          </DialogHeader>
          {previewFinding?.preview && (
            <div className="diff-view">
              <p className="diff-label">{previewFinding.preview.label}</p>
              <div className="diff-row before"><span>BEFORE</span><p>{previewFinding.preview.before}</p></div>
              <div className="diff-row after"><span>AFTER</span><p>{previewFinding.preview.after}</p></div>
            </div>
          )}
          <div className="dialog-safety"><Lock aria-hidden="true" /> No Notion content will be changed.</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewFinding(null)}>Cancel</Button>
            <Button onClick={approvePreview}><Check aria-hidden="true" /> Approve for later</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
