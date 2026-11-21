import { ReviewBrief } from "@/features/repair/brief/ReviewBrief";

export default async function ReviewPage({ params }: PageProps<"/repair/[requestId]/review">) {
  const { requestId } = await params;
  return <ReviewBrief key={requestId} requestId={requestId} />;
}
