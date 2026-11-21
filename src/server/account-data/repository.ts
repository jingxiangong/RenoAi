import "server-only";

import { removeEvidence } from "@/server/storage/evidence";
import { createRenoSupabase } from "@/server/supabase";

export type AccountRecordKind = "property" | "request";

const recordTables = {
  property: "reno_properties",
  request: "reno_requests",
} satisfies Record<AccountRecordKind, string>;

export async function listAccountRecords(ownerId: string) {
  const supabase = createRenoSupabase(ownerId);
  const [properties, requests] = await Promise.all([
    supabase.from(recordTables.property).select("data").eq("owner_id", ownerId).order("updated_at", { ascending: false }),
    supabase.from(recordTables.request).select("data").eq("owner_id", ownerId).order("updated_at", { ascending: false }),
  ]);
  if (properties.error) throw properties.error;
  if (requests.error) throw requests.error;
  return {
    properties: (properties.data || []).map((row) => row.data),
    requests: (requests.data || []).map((row) => row.data),
  };
}

export async function saveAccountRecord(ownerId: string, kind: AccountRecordKind, data: { id: string }) {
  const { error } = await createRenoSupabase(ownerId).from(recordTables[kind]).upsert(
    { owner_id: ownerId, id: data.id, data, updated_at: new Date().toISOString() },
    { onConflict: "owner_id,id" },
  );
  if (error) throw error;
}

export async function deleteAccountRecord(ownerId: string, kind: AccountRecordKind, id: string) {
  const supabase = createRenoSupabase(ownerId);
  const table = recordTables[kind];
  if (kind === "request") {
    const existing = await supabase.from(table).select("data").eq("owner_id", ownerId).eq("id", id).maybeSingle();
    if (existing.error) throw existing.error;
    await removeEvidence(ownerId, existing.data?.data?.evidence);
  }

  const { error } = await supabase.from(table).delete().eq("owner_id", ownerId).eq("id", id);
  if (error) throw error;
}
