import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { PropertySchema } from "@/schemas/property.schema";
import { deleteAccountRecord, listAccountRecords, saveAccountRecord } from "@/server/account-data/repository";
import { cacheScopeForEmail } from "@/server/cache-scope";
import { ownerIdForEmail } from "@/server/supabase";

function accountRoute(fallback: string, operation: (request: Request, ownerId: string) => Promise<Response>) {
  return auth(async (request) => {
    const email = request.auth?.user?.email;
    if (!email) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    if (request.headers.get("x-reno-cache-scope") !== cacheScopeForEmail(email)) {
      return NextResponse.json({ error: "Account changed. Reload and try again." }, { status: 409 });
    }

    try {
      return await operation(request, ownerIdForEmail(email));
    } catch (error) {
      console.error(fallback, error);
      return NextResponse.json({ error: fallback }, { status: 500 });
    }
  });
}

export const GET = accountRoute("Unable to load saved data", async (_request, ownerId) => {
  return NextResponse.json(await listAccountRecords(ownerId));
});

export const POST = accountRoute("Unable to save data", async (request, ownerId) => {
  const body = await request.json() as { kind?: unknown; data?: { id?: unknown } };
  if (body?.kind === "property") {
    await saveAccountRecord(ownerId, "property", PropertySchema.parse(body.data));
  } else {
    const data = body?.data;
    if (body?.kind !== "request" || typeof data?.id !== "string" || !data.id) {
      return NextResponse.json({ error: "Invalid saved record" }, { status: 400 });
    }
    // Keep the full legacy JSON record, including fields added by different client versions.
    await saveAccountRecord(ownerId, "request", { ...data, id: data.id });
  }
  return NextResponse.json({ ok: true });
});

export const DELETE = accountRoute("Unable to delete data", async (request, ownerId) => {
  const body = await request.json() as { kind?: unknown; id?: unknown };
  if ((body?.kind !== "property" && body?.kind !== "request") || typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Invalid delete request" }, { status: 400 });
  }
  await deleteAccountRecord(ownerId, body.kind, body.id);
  return NextResponse.json({ ok: true });
});
