import { ResultPage } from "@/features/repair/project/ResultPage";

export default async function Page({ params }: PageProps<"/repair/[requestId]/result">) {
  const { requestId } = await params;
  return <ResultPage key={requestId} requestId={requestId} />;
}
