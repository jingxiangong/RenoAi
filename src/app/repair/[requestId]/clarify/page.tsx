import { ClarificationForm } from "@/features/repair/brief/ClarificationForm";

export default async function ClarifyPage({ params }: PageProps<"/repair/[requestId]/clarify">) {
  const { requestId } = await params;
  return <ClarificationForm key={requestId} requestId={requestId} />;
}
