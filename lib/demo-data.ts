import type { WorkspacePage, WorkspaceSnapshot } from "@/lib/audit";

const pages: WorkspacePage[] = [
  {
    id: "page-01",
    title: "Mobile onboarding",
    lastEdited: "2026-08-29T14:20:00.000Z",
    properties: { Status: "In progress", Owner: "Maya", Priority: "High", "Launch date": "2026-09-18", Summary: "Reduce first-session friction." },
  },
  {
    id: "page-02",
    title: "Enterprise permissions",
    lastEdited: "2026-08-26T09:10:00.000Z",
    properties: { Status: "Planning", Owner: "Theo", Priority: "High", "Launch date": "2026-10-02", Summary: "Make role policies easier to understand." },
  },
  {
    id: "page-03",
    title: "AI meeting notes",
    lastEdited: "2026-08-31T16:42:00.000Z",
    properties: { Status: "In-progress", Owner: null, Priority: "Medium", "Launch date": "2026-09-26", Summary: "Turn transcripts into useful follow-ups." },
  },
  {
    id: "page-04",
    title: "Template gallery refresh",
    lastEdited: "2026-08-20T12:05:00.000Z",
    properties: { Status: "Done", Owner: "Nora", Priority: "Low", "Launch date": "2026-08-22", Summary: "Improve template discovery." },
  },
  {
    id: "page-05",
    title: "Search quality",
    lastEdited: "2026-08-30T11:28:00.000Z",
    properties: { Status: "In progress", Owner: null, Priority: "High", "Launch date": null, Summary: "Tune ranking for workspace results." },
  },
  {
    id: "page-06",
    title: "Offline mode",
    lastEdited: "2026-04-04T08:00:00.000Z",
    properties: { Status: "Planning", Owner: "Ari", Priority: "Medium", "Launch date": null, Summary: "Keep key pages available without a connection." },
  },
  {
    id: "page-07",
    title: "mobile-onboarding",
    lastEdited: "2026-08-25T18:00:00.000Z",
    properties: { Status: "In progress", Owner: null, Priority: "Medium", "Launch date": "2026-09-30", Summary: "Prototype for a shorter welcome flow." },
  },
  {
    id: "page-08",
    title: "Database automations",
    lastEdited: "2026-05-12T10:30:00.000Z",
    properties: { Status: "Backlog", Owner: null, Priority: "Low", "Launch date": null, Summary: "Remove repetitive project updates." },
  },
  {
    id: "page-09",
    title: "Comment notifications",
    lastEdited: "2026-08-27T07:55:00.000Z",
    properties: { Status: "Done", Owner: "June", Priority: "Medium", "Launch date": "2026-08-28", Summary: "Make notification controls clearer." },
  },
  {
    id: "page-10",
    title: "API docs navigation",
    lastEdited: "2026-03-16T13:15:00.000Z",
    properties: { Status: "Backlog", Owner: null, Priority: "Low", "Launch date": null, Summary: "Help developers find endpoint guidance faster." },
  },
  {
    id: "page-11",
    title: "Import reliability",
    lastEdited: "2026-08-28T15:14:00.000Z",
    properties: { Status: "In progress", Owner: "Lena", Priority: "High", "Launch date": "2026-09-12", Summary: "Make large imports easier to recover." },
  },
  {
    id: "page-12",
    title: "Teamspaces education",
    lastEdited: "2026-08-24T10:12:00.000Z",
    properties: { Status: "Planning", Owner: "Sam", Priority: "Medium", "Launch date": "2026-10-08", Summary: "Explain teamspace permissions in context." },
  },
];

export const demoSnapshot: WorkspaceSnapshot = {
  sourceId: "demo-product-roadmap",
  sourceName: "Product roadmap · Demo",
  scannedAt: "2026-09-01T17:40:00.000Z",
  properties: [
    { id: "prop-title", name: "Project", type: "title", description: "The clear name of the product initiative." },
    {
      id: "prop-status",
      name: "Status",
      type: "status",
      description: "The current stage of the initiative.",
      options: ["Backlog", "Planning", "In progress", "In-progress", "Done"],
    },
    { id: "prop-owner", name: "Owner", type: "people", description: null },
    {
      id: "prop-priority",
      name: "Priority",
      type: "select",
      description: "The relative urgency of this initiative.",
      options: ["Low", "Medium", "High"],
    },
    { id: "prop-date", name: "Launch date", type: "date", description: "" },
    { id: "prop-summary", name: "Summary", type: "rich_text", description: "A one-sentence description of the user outcome." },
  ],
  pages,
};
