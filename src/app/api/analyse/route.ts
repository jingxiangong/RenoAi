import { NextResponse } from "next/server";
import { analyseProject } from "@/server/pipeline/analyse-project";
import { FinalAnalysisInputSchema, repairErrorResponse } from "@/server/ai/repair-api";
import { auth } from "@/auth";

export const POST = auth(async function POST(request) {
  const email = request.auth?.user?.email;
  if (!email) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  try {
    const { problem, evidence } = FinalAnalysisInputSchema.parse(await request.json());
    return NextResponse.json(await analyseProject(problem, evidence, email));
  } catch (error) {
    return repairErrorResponse(error, "Unable to analyse project.");
  }
});
