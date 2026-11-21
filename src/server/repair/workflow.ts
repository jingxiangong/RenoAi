import "server-only";

import { ProblemAnalysisSchema, type ProblemAnalysis, type ProblemBrief } from "@/schemas/problem-brief.schema";
import type { ProjectBrief } from "@/schemas/project-brief.schema";
import { RepairResultSchema, type RepairResult } from "@/schemas/repair-result.schema";
import { problemBriefSystemPrompt } from "@/server/ai/prompts/problem-brief";
import { repairAgentSystemPrompt } from "@/server/ai/prompts/repair-agent";
import { requestQwen } from "@/server/ai/qwen";
import type { QwenCall } from "@/server/ai/qwen-quota";
import { estimatePrice } from "@/server/pricing/engine";
import { demoAnalysis, demoRepair } from "./demo";
import type { FinalAnalysisInput, ProblemAnalysisInput } from "./inputs";

export async function createProblemAnalysis(
  input: ProblemAnalysisInput,
  email: string,
  stage: Extract<QwenCall["stage"], "extract" | "clarify">,
): Promise<ProblemAnalysis> {
  const analysis = process.env.AI_DEMO_MODE === "true"
    ? demoAnalysis(input)
    : await requestQwen({
        call: { email, requestId: input.request_id, stage },
        schema: ProblemAnalysisSchema,
        system: stage === "clarify"
          ? `${problemBriefSystemPrompt}\nThis is the last clarification round. Keep unknown details as Unknown and return no questions.`
          : problemBriefSystemPrompt,
        input: {
          request_id: input.request_id,
          selected_property: input.property,
          description: input.description,
          selected_issue_type: input.category_hint,
          existing_problem_brief: input.existing_problem_brief || input.existing_brief,
          clarification_history: input.clarification_history,
          new_clarification: input.clarification,
        },
        images: stage === "extract" ? input.image_data_urls : undefined,
      });

  const problem_brief = {
    ...analysis.problem_brief,
    request_id: input.request_id,
    property_id: input.property.id,
    property: input.property.home_type,
  };
  if (stage === "clarify" || analysis.is_complete || !analysis.missing_questions.length) {
    return { problem_brief, is_complete: true, missing_questions: [] };
  }
  return { ...analysis, problem_brief };
}

async function analyseRepair(brief: ProblemBrief, email: string): Promise<RepairResult> {
  if (process.env.AI_DEMO_MODE === "true") return demoRepair(brief);
  return requestQwen({
    call: { email, requestId: brief.request_id, stage: "repair" },
    schema: RepairResultSchema,
    system: repairAgentSystemPrompt,
    input: brief,
  });
}

export async function analyseProject({ problem, evidence }: FinalAnalysisInput, email: string): Promise<ProjectBrief> {
  const [repair, pricing] = await Promise.all([analyseRepair(problem, email), estimatePrice(problem)]);
  return {
    request_id: problem.request_id,
    status: "ready",
    problem,
    repair,
    pricing,
    evidence,
    user_confirmation: { confirmed: true, confirmed_at: new Date().toISOString() },
  };
}
