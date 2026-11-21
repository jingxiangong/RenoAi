import type { RepairRequest } from "@/features/account-data/store";
import type { ProblemAnalysis } from "@/schemas/problem-brief.schema";
import type { ProjectBrief } from "@/schemas/project-brief.schema";
import type { Property } from "@/schemas/property.schema";
import { readAnalysisImages } from "../analysis-images";
import { postRepair } from "../api";

export type AnalysisStage = "problem" | "project";

type AnalysisUpdate = {
  request: RepairRequest;
  destination: "result" | "review" | "clarify";
};

export async function runAnalysis(
  stage: AnalysisStage,
  request: RepairRequest,
  property: Property,
): Promise<AnalysisUpdate> {
  if (stage === "project") {
    if (!request.analysis) throw new Error("The repair brief is missing.");
    const project = await postRepair<ProjectBrief>("/api/analyse", {
      problem: request.analysis.problem_brief,
      evidence: request.evidence,
    }, "Analysis could not be completed.");
    return { request: { ...request, status: "ready", project }, destination: "result" };
  }

  const analysis = await postRepair<ProblemAnalysis>("/api/problem-brief", {
    request_id: request.id,
    property,
    description: request.description,
    category_hint: request.category_hint,
    image_data_urls: readAnalysisImages(request.id),
  }, "Unable to prepare your brief.");

  return {
    request: { ...request, analysis, status: analysis.is_complete ? "review" : "collecting_info" },
    destination: analysis.is_complete ? "review" : "clarify",
  };
}
