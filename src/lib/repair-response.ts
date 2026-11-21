export async function readRepairResponse(response: Response, fallback: string) {
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : fallback;
    throw new Error(message);
  }
  if (!body) throw new Error(fallback);
  return body;
}
