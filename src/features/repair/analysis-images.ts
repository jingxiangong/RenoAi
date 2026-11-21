import { MAX_REPAIR_PHOTOS } from "@/lib/repair-limits";

function imageKey(requestId: string) {
  return `renoai.analysis-images.${requestId}`;
}

export function saveAnalysisImages(requestId: string, imageDataUrls: string[]) {
  sessionStorage.setItem(imageKey(requestId), JSON.stringify(imageDataUrls));
}

export function readAnalysisImages(requestId: string): string[] {
  try {
    const images: unknown = JSON.parse(sessionStorage.getItem(imageKey(requestId)) ?? "[]");
    return Array.isArray(images)
      ? images.filter((image): image is string => typeof image === "string").slice(0, MAX_REPAIR_PHOTOS)
      : [];
  } catch {
    return [];
  }
}

export function clearAnalysisImages(requestId: string) {
  sessionStorage.removeItem(imageKey(requestId));
}
