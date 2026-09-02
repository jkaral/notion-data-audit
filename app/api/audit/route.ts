import { auditWorkspace } from "@/lib/audit";
import { getNotionSnapshot, notionConfiguration } from "@/lib/notion";

export async function GET() {
  return Response.json({ configured: notionConfiguration().configured });
}

export async function POST() {
  try {
    const snapshot = await getNotionSnapshot();
    return Response.json({ ok: true, result: auditWorkspace(snapshot) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The audit could not be completed.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
