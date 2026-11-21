import { NextResponse } from "next/server";
import { createProblemAnalysis } from "@/server/ai/qwen";
import { ClarificationInputSchema, repairErrorResponse } from "@/server/ai/repair-api";
import { auth } from "@/auth";

export const POST = auth(async function POST(request) {
  const email = request.auth?.user?.email;
  if (!email) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const input = ClarificationInputSchema.parse(await request.json());
    return NextResponse.json(await createProblemAnalysis(input, email, "clarify"));
  } catch (error) {
    return repairErrorResponse(error, "Unable to update problem brief.");
  }
});
