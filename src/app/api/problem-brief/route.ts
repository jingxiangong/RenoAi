import { NextResponse } from "next/server";
import { createProblemAnalysis } from "@/server/ai/qwen";
import { ExtractionInputSchema, repairErrorResponse } from "@/server/ai/repair-api";
import { auth } from "@/auth";

export const POST = auth(async function POST(request) {
  const email = request.auth?.user?.email;
  if (!email) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const input = ExtractionInputSchema.parse(await request.json());
    return NextResponse.json(await createProblemAnalysis(input, email, "extract"));
  } catch (error) {
    return repairErrorResponse(error, "Unable to create problem brief.");
  }
});
