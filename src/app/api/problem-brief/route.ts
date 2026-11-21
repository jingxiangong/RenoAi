import { ExtractionInputSchema } from "@/server/repair/inputs";
import { repairPost } from "@/server/repair/route-handler";
import { createProblemAnalysis } from "@/server/repair/workflow";

export const POST = repairPost(
  ExtractionInputSchema,
  (input, email) => createProblemAnalysis(input, email, "extract"),
  "Unable to create problem brief.",
);
