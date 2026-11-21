import { redirect } from "next/navigation";

export default async function Page({ params }: PageProps<"/requests/[requestId]">) {
  const { requestId } = await params;
  redirect(`/repair/${requestId}/result`);
}
