import "server-only";

import { randomUUID } from "node:crypto";
import { createRenoSupabase, EVIDENCE_BUCKET } from "@/server/supabase";

type EvidenceUpload = { requestId: string; fileName: string; contentType: string };
type StoredMedia = { storage_path?: string };
type StoredEvidence = { photos?: StoredMedia[]; videos?: StoredMedia[] };

function fileExtension(fileName: string, contentType: string) {
  const candidate = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (candidate && candidate.length <= 8) return candidate;
  return contentType.startsWith("video/") ? "mp4" : "jpg";
}

export async function prepareEvidenceUpload(ownerId: string, { requestId, fileName, contentType }: EvidenceUpload) {
  const path = `${ownerId}/${requestId}/${randomUUID()}.${fileExtension(fileName, contentType)}`;
  const bucket = createRenoSupabase(ownerId).storage.from(EVIDENCE_BUCKET);
  const { data, error } = await bucket.createSignedUploadUrl(path);
  if (error) throw error;
  return { bucket: EVIDENCE_BUCKET, path, token: data.token };
}

export async function signEvidenceRead(ownerId: string, path: string) {
  const bucket = createRenoSupabase(ownerId).storage.from(EVIDENCE_BUCKET);
  const { data, error } = await bucket.createSignedUrl(path, 60 * 60 * 24 * 365);
  if (error) throw error;
  return { url: data.signedUrl };
}

export async function removeEvidence(ownerId: string, evidence?: StoredEvidence) {
  const photos = Array.isArray(evidence?.photos) ? evidence.photos : [];
  const videos = Array.isArray(evidence?.videos) ? evidence.videos : [];
  const paths = [...photos, ...videos]
    .map((media) => media?.storage_path)
    .filter((path): path is string => typeof path === "string" && path.startsWith(`${ownerId}/`));
  if (!paths.length) return;
  const bucket = createRenoSupabase(ownerId).storage.from(EVIDENCE_BUCKET);
  const { error } = await bucket.remove(paths);
  if (error) console.error("Supabase evidence cleanup failed", error);
}
