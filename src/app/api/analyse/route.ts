import { FinalAnalysisInputSchema } from "@/server/repair/inputs";
import { repairPost } from "@/server/repair/route-handler";
import { analyseProject } from "@/server/repair/workflow";

export const POST = repairPost(FinalAnalysisInputSchema, analyseProject, "Unable to analyse project.");
