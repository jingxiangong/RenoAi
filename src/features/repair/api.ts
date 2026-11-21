type RepairEndpoint = "/api/problem-brief" | "/api/clarify" | "/api/analyse" | "/api/price";

export async function postRepair<T>(endpoint: RepairEndpoint, input: object, fallback: string): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(typeof body?.error === "string" ? body.error : fallback);
  }
  if (!body) throw new Error(fallback);
  return body as T;
}
