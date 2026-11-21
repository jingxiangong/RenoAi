import { ContractorProjectView } from "@/features/repair/project/ContractorProjectView";

export default async function ContractorPage({ params }: PageProps<"/requests/[requestId]/contractor">) {
  const { requestId } = await params;
  return <ContractorProjectView key={requestId} requestId={requestId} />;
}
