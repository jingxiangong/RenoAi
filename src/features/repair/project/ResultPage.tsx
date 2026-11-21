"use client";

import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocalStore } from "@/features/account-data/context";
import type { PriceResult } from "@/schemas/price-result.schema";
import { postRepair } from "../api";
import { useRepairRequest } from "../use-repair-request";
import { UserProjectView } from "./UserProjectView";

export function ResultPage({ requestId }: { requestId: string }) {
  const localStore = useLocalStore();
  const router = useRouter();
  const [request, setRequest] = useRepairRequest(requestId);

  useEffect(() => {
    const project = request?.project;
    if (!request || !project || project.pricing.available) return;

    let cancelled = false;
    void postRepair<PriceResult>("/api/price", { problem: project.problem }, "Unable to refresh the estimate.")
      .then((pricing) => {
        if (cancelled || !pricing.available) return;
        const next = { ...request, project: { ...project, pricing } };
        localStore.saveRequest(next);
        setRequest(next);
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [localStore, request, setRequest]);

  function goBack() {
    const previousPageIsInApp = document.referrer
      ? new URL(document.referrer).origin === window.location.origin
      : false;
    if (previousPageIsInApp) router.back();
    else router.push("/requests");
  }

  return (
    <main className="result-brief-page">
      <div className="result-back-row">
        <button className="result-back-button" type="button" aria-label="Go back" onClick={goBack}>
          <ChevronLeft aria-hidden size={24} strokeWidth={1.8} />
        </button>
      </div>
      {request?.project
        ? <UserProjectView project={request.project} description={request.description} category={request.category_hint} />
        : <div className="result-brief-empty">Project not found or still processing.</div>}
    </main>
  );
}
