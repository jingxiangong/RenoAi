import { MAX_AI_IMAGE_DATA_URL_LENGTH, MAX_ATTACHMENT_BYTES, MAX_REPAIR_PHOTOS } from "@/lib/repair-limits";
import { getSupabaseBrowser } from "./supabase-browser";
import type { MediaItem } from "@/schemas/project-brief.schema";

export type RepairAttachment = { id: string; file: File };

export type AttachmentSelection = { attachments: RepairAttachment[]; error: string };

export function appendAttachments(current: RepairAttachment[], additions: RepairAttachment[]): AttachmentSelection {
  const attachments = [...current];
  let photoCount = current.filter(({ file }) => file.type.startsWith("image/")).length;
  let error = "";

  for (const attachment of additions) {
    const { file } = attachment;
    const isPhoto = file.type.startsWith("image/");
    if (!isPhoto && !file.type.startsWith("video/")) {
      error = "Choose a photo or video.";
    } else if (file.size > MAX_ATTACHMENT_BYTES) {
      error = `${file.name} is larger than ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB.`;
    } else if (isPhoto && photoCount >= MAX_REPAIR_PHOTOS) {
      error = `You can add up to ${MAX_REPAIR_PHOTOS} photos per repair.`;
    } else {
      attachments.push(attachment);
      if (isPhoto) photoCount++;
    }
  }
  return { attachments, error };
}

async function imageDataUrl(file: File) {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error(`Unable to prepare ${file.name}.`);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const primary = canvas.toDataURL("image/jpeg", 0.76);
    if (primary.length <= MAX_AI_IMAGE_DATA_URL_LENGTH) return primary;
    const compressed = canvas.toDataURL("image/jpeg", 0.52);
    if (compressed.length > MAX_AI_IMAGE_DATA_URL_LENGTH) {
      throw new Error(`${file.name} could not be compressed enough. Try a smaller photo.`);
    }
    return compressed;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadEvidence(requestId: string, file: File, index: number): Promise<MediaItem> {
  const prepared = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, fileName: file.name, contentType: file.type }),
  });
  if (!prepared.ok) throw new Error("Unable to prepare upload");
  const upload = await prepared.json() as { bucket: string; path: string; token: string };
  const { error } = await getSupabaseBrowser().storage
    .from(upload.bucket)
    .uploadToSignedUrl(upload.path, upload.token, file, { contentType: file.type, cacheControl: "3600" });
  if (error) throw error;

  const signed = await fetch("/api/uploads", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: upload.path }),
  });
  if (!signed.ok) throw new Error("Unable to create media URL");
  const { url } = await signed.json() as { url: string };
  return {
    id: `${requestId}_media_${index}`,
    type: file.type.startsWith("video/") ? "video" : "photo",
    storage_url: url,
    storage_path: upload.path,
  };
}

export async function prepareRepairEvidence(requestId: string, attachments: RepairAttachment[]) {
  const files = attachments.map(({ file }) => file);
  const imageDataUrls = await Promise.all(files.filter((file) => file.type.startsWith("image/")).map(imageDataUrl));
  const uploadedMedia = await Promise.all(files.map((file, index) => uploadEvidence(requestId, file, index)));

  const evidence: { photos: MediaItem[]; videos: MediaItem[] } = { photos: [], videos: [] };
  for (const item of uploadedMedia) {
    evidence[item.type === "photo" ? "photos" : "videos"].push(item);
  }
  return { evidence, imageDataUrls };
}
