import { ClarificationInputSchema } from "@/server/repair/inputs";
import { repairPost } from "@/server/repair/route-handler";
import { createProblemAnalysis } from "@/server/repair/workflow";

export const POST = repairPost(
  ClarificationInputSchema,
  (input, email) => createProblemAnalysis(input, email, "clarify"),
  "Unable to update problem brief.",
);
