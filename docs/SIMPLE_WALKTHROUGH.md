# Notion Data Audit in plain English

## The one-sentence explanation

Notion Data Audit is like **spell-check for the structure of a Notion database**: it finds confusing or missing information, shows proof, and suggests what a person should review.

## The problem

Imagine a team has a Notion project list. Some projects have no owner, two status labels mean the same thing, and two pages have almost identical names. A person may notice those problems eventually. An AI tool may simply use the messy information and give a weak answer.

Notion Data Audit checks the organization of that information before the team depends on it.

## What happens when you click “Run workspace audit”

1. The app gets a snapshot of one database. In demo mode, that snapshot is already included in the project. In live mode, the server reads it from Notion.
2. The audit engine runs five checklists: clarity, completeness, consistency, uniqueness, and freshness.
3. Every failed check creates a finding with evidence and subtracts a visible number of points.
4. The React dashboard shows the score, filters, evidence, and suggested next step.
5. Some findings can show a before-and-after preview. Approving a preview only changes the current browser session; it does not edit Notion.

## The four important pieces

| Piece | Simple meaning | Main file |
|---|---|---|
| Dashboard | The screen the user sees and clicks | `components/workspace-proof-app.tsx` |
| Audit engine | The checklist that finds problems and calculates the score | `lib/audit.ts` |
| Notion adapter | The translator between Notion's API response and our simple data shape | `lib/notion.ts` |
| API route | The guarded server door the browser uses for a live scan | `app/api/audit/route.ts` |

## Why the score is trustworthy

The demo score is 70 because its findings subtract 30 total points from 100. The point values are in the findings themselves. If the same data goes in, the same result comes out. The tests prove important boundaries, including that a clean source scores 100 and a score can never fall below zero.

This is called **deterministic** behavior. It is useful here because a user can understand and challenge the result.

## What is real today

- The demo scan and all five rule families work.
- The score and evidence come from the audit engine, not display-only sample text.
- Filters, finding selection, fix previews, local approvals, rescanning, and Markdown export work.
- The server can read a real Notion data source when its two environment variables are configured.
- The project has automated tests and a production build.

## What is intentionally not built yet

- It does not automatically change a Notion workspace.
- It does not have user accounts or saved scan history.
- It does not currently call an LLM or create embeddings.

That last point matters: describe this version as **AI-readiness tooling**, not as an AI model. A sensible next version would add one semantic check—for example, flagging vague descriptions—but would still show evidence and require human review.

## A 45-second interview answer

> I built Notion Data Audit, which is like a structure checker for Notion databases. Teams increasingly use their workspace as context for AI, but missing owners, duplicate labels, vague properties, and stale pages can make the answers unreliable. My app reads one data source, converts it into a typed snapshot, and runs five deterministic rule families. Every finding includes the exact evidence, its impact, a suggested next step, and a transparent score deduction. I started with a read-only design, server-side credentials, and local fix previews because I wanted the user to stay in control. The next thing I would validate is whether real teams find these checks useful before adding semantic AI checks or write access.

## Good follow-up answers

**Why did you avoid automatic fixes?**
The product is still proving whether its suggestions are correct. Read-only access keeps the risk small and gives users a chance to build trust.

**Why not let an LLM calculate the whole score?**
A fixed rules layer is reproducible, testable, and easy to explain. An LLM can later help with fuzzy language questions, but it should add evidence instead of hiding the reasoning.

**Why keep the Notion token on the server?**
If a token is placed in browser code, users can inspect and copy it. The server route keeps the secret away from the browser.

**What would you build next?**
I would interview a few users, measure which findings they act on, then add OAuth and audit history. Only after that would I test a small semantic rule and a reversible write flow.

## The easiest way to learn the code

1. Open `lib/demo-data.ts` and find the intentionally missing owners.
2. Open `lib/audit.ts` and find `AUDIT-COMPLETE-002`, the rule that catches them.
3. Change one demo owner from `null` to a name.
4. Run `npm test` and open the app again.
5. Watch how the evidence and score change.

That small experiment connects the input data, business rule, tests, and interface—the main idea behind the whole project.
