import type {
  CellValue,
  PropertyType,
  WorkspacePage,
  WorkspaceProperty,
  WorkspaceSnapshot,
} from "@/lib/audit";

const NOTION_VERSION = "2026-03-11";
const MAX_PAGES = 500;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function plainText(value: unknown): string {
  if (typeof value === "string") return value;
  return asArray(value)
    .map((item) => {
      const record = asRecord(item);
      const text = asString(record.plain_text);
      if (text) return text;
      return asString(asRecord(record.text).content);
    })
    .join("");
}

function propertyType(value: string): PropertyType {
  const supported = new Set<PropertyType>([
    "title",
    "rich_text",
    "status",
    "select",
    "multi_select",
    "people",
    "date",
    "number",
    "checkbox",
    "relation",
  ]);
  return supported.has(value as PropertyType) ? (value as PropertyType) : "unknown";
}

function optionNames(property: JsonRecord, type: PropertyType): string[] | undefined {
  if (type !== "status" && type !== "select" && type !== "multi_select") return undefined;
  const config = asRecord(property[type]);
  return asArray(config.options)
    .map((option) => asString(asRecord(option).name))
    .filter(Boolean);
}

function mapSchema(propertiesValue: unknown): WorkspaceProperty[] {
  return Object.entries(asRecord(propertiesValue)).map(([name, value]) => {
    const property = asRecord(value);
    const type = propertyType(asString(property.type));
    const description = plainText(property.description).trim();
    return {
      id: asString(property.id) || name,
      name,
      type,
      description: description || null,
      options: optionNames(property, type),
    };
  });
}

function mapCell(value: unknown): CellValue {
  const property = asRecord(value);
  const type = asString(property.type);
  const typedValue = property[type];

  switch (type) {
    case "title":
    case "rich_text":
      return plainText(typedValue).trim() || null;
    case "status":
    case "select":
      return asString(asRecord(typedValue).name) || null;
    case "multi_select":
      return asArray(typedValue)
        .map((option) => asString(asRecord(option).name))
        .filter(Boolean);
    case "people":
      return asArray(typedValue)
        .map((person) => {
          const record = asRecord(person);
          return asString(record.name) || asString(record.id);
        })
        .filter(Boolean);
    case "date":
      return asString(asRecord(typedValue).start) || null;
    case "number":
      return typeof typedValue === "number" ? typedValue : null;
    case "checkbox":
      return typeof typedValue === "boolean" ? typedValue : null;
    case "relation":
      return asArray(typedValue)
        .map((relation) => asString(asRecord(relation).id))
        .filter(Boolean);
    default:
      return null;
  }
}

function mapPage(value: unknown): WorkspacePage {
  const page = asRecord(value);
  const rawProperties = asRecord(page.properties);
  const properties = Object.fromEntries(
    Object.entries(rawProperties).map(([name, cell]) => [name, mapCell(cell)]),
  );
  const title = Object.values(rawProperties)
    .filter((cell) => asString(asRecord(cell).type) === "title")
    .map(mapCell)
    .find((cell) => typeof cell === "string" && cell.trim());

  return {
    id: asString(page.id),
    title: typeof title === "string" ? title : "Untitled",
    lastEdited: asString(page.last_edited_time) || new Date().toISOString(),
    properties,
  };
}

async function notionFetch(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = asRecord(await response.json().catch(() => ({})));
    const message = asString(payload.message) || `Notion returned ${response.status}.`;
    throw new Error(message);
  }
  return response.json() as Promise<unknown>;
}

export function notionConfiguration() {
  const token = process.env.NOTION_API_KEY || process.env.NOTION_TOKEN || "";
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID || "";
  return { configured: Boolean(token && dataSourceId), token, dataSourceId };
}

export async function getNotionSnapshot(): Promise<WorkspaceSnapshot> {
  const { configured, token, dataSourceId } = notionConfiguration();
  if (!configured) {
    throw new Error(
      "Live mode is not configured. Add NOTION_API_KEY and NOTION_DATA_SOURCE_ID to the server environment.",
    );
  }

  const dataSource = asRecord(await notionFetch(`/data_sources/${dataSourceId}`, token));
  const pages: WorkspacePage[] = [];
  let cursor = "";

  do {
    const payload = asRecord(
      await notionFetch(`/data_sources/${dataSourceId}/query`, token, {
        method: "POST",
        body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
      }),
    );
    pages.push(...asArray(payload.results).map(mapPage));
    cursor = payload.has_more ? asString(payload.next_cursor) : "";
  } while (cursor && pages.length < MAX_PAGES);

  return {
    sourceId: asString(dataSource.id) || dataSourceId,
    sourceName: plainText(dataSource.title).trim() || "Connected Notion data source",
    scannedAt: new Date().toISOString(),
    properties: mapSchema(dataSource.properties),
    pages: pages.slice(0, MAX_PAGES),
  };
}
