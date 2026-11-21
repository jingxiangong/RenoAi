import "server-only";

import { createHash } from "node:crypto";

// This cache namespace is separate from the secret-derived Supabase owner ID.
export function cacheScopeForEmail(email: string) {
  return createHash("sha256").update("renoai-browser-cache:").update(email.trim().toLowerCase()).digest("hex");
}
