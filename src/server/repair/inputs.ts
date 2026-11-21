import { z } from "zod";
import {
  MAX_AI_IMAGE_DATA_URL_LENGTH,
  MAX_CLARIFICATION_ANSWER_LENGTH,
  MAX_REPAIR_DESCRIPTION_LENGTH,
  MAX_REPAIR_PHOTOS,
} from "@/lib/repair-limits";
import { ProblemBriefSchema } from "@/schemas/problem-brief.schema";
import { MediaItemSchema } from "@/schemas/project-brief.schema";
import { PropertySchema } from "@/schemas/property.schema";

const RequestIdSchema = z.string().trim().min(1).max(128);

const problemInput = {
  request_id: RequestIdSchema,
  property: PropertySchema.pick({ id: true, home_type: true }),
  description: z.string().trim().min(1).max(MAX_REPAIR_DESCRIPTION_LENGTH),
  category_hint: z.string().max(100).optional(),
};

export const ExtractionInputSchema = z.object({
  ...problemInput,
  image_data_urls: z.array(z.string().max(MAX_AI_IMAGE_DATA_URL_LENGTH)
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/))
    .max(MAX_REPAIR_PHOTOS).optional(),
});

const clarificationFields = z.object({
  clarification: z.string().max(4_000),
  existing_problem_brief: ProblemBriefSchema.optional(),
  existing_brief: ProblemBriefSchema.optional(),
  clarification_history: z.array(z.object({
    question: z.string().max(500),
    answer: z.string().trim().min(1).max(MAX_CLARIFICATION_ANSWER_LENGTH),
  })).max(4),
});

export const ClarificationInputSchema = z.object({ ...problemInput, ...clarificationFields.shape });

export type ProblemAnalysisInput = z.infer<typeof ExtractionInputSchema> & Partial<z.infer<typeof clarificationFields>>;

export const FinalAnalysisInputSchema = z.object({
  problem: ProblemBriefSchema.extend({ request_id: RequestIdSchema }),
  evidence: z.object({ photos: z.array(MediaItemSchema), videos: z.array(MediaItemSchema) })
    .default({ photos: [], videos: [] }),
});

export type FinalAnalysisInput = z.infer<typeof FinalAnalysisInputSchema>;
