import { AnalysisProgress } from "@/features/repair/processing/AnalysisProgress";

export default async function ProcessingPage({ params, searchParams }: PageProps<"/repair/[requestId]/processing">) {
  const [{ requestId }, query] = await Promise.all([params, searchParams]);
  const stage = query.stage === "project" ? "project" : "problem";
  return <AnalysisProgress key={`${requestId}:${stage}`} requestId={requestId} stage={stage} />;
}
