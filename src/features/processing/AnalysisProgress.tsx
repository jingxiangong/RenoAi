"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { SquarePen } from "lucide-react";
import type { RepairRequest } from "@/lib/local-store";
import { useLocalStore } from "@/lib/local-store-context";
import { MAX_REPAIR_PHOTOS } from "@/lib/repair-limits";
import { readRepairResponse } from "@/lib/repair-response";

const problemPhases = [
  "Reading your photos and description",
  "Identifying the affected area and item",
  "Preparing your repair brief",
];

const projectPhases = [
  "Checking the likely repair method",
  "Comparing duration and price guidance",
  "Preparing your final repair plan",
];

export function AnalysisProgress({ stage }: { stage: "problem" | "project" }) {
  const localStore = useLocalStore();
  const { requestId } = useParams<{ requestId: string }>();
  const router = useRouter();
  const started = useRef(false);
  const [item, setItem] = useState<RepairRequest>();
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState("");
  const phases = stage === "problem" ? problemPhases : projectPhases;
  const phaseHeadings = stage === "problem"
    ? ["Starting the image analysis", "Detecting the repair issue", "Building your repair brief"]
    : ["Starting the repair analysis", "Checking repair and pricing", "Finishing your repair plan"];

  useEffect(() => {
    if (error) return;
    const timer = window.setInterval(() => setPhase((value) => (value + 1) % phases.length), 900);
    return () => window.clearInterval(timer);
  }, [error, phases.length]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const request = localStore.request(requestId);
    setItem(request);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser storage is read after hydration.
    if (!request) { setError("Request not found."); return; }

    const startedAt = Date.now();
    const waitForAnimation = async () => {
      const remaining = 2200 - (Date.now() - startedAt);
      if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
    };

    if (stage === "project") {
      if (!request.analysis) { setError("The repair brief is missing."); return; }
      fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: request.analysis.problem_brief, evidence: request.evidence }),
      })
        .then(async (response) => {
          const project = await readRepairResponse(response, "Analysis could not be completed.");
          await waitForAnimation();
          localStore.saveRequest({ ...request, status: "ready", project });
          router.replace(`/repair/${requestId}/result`);
        })
        .catch((error: Error) => setError(error.message));
      return;
    }

    let imageDataUrls: string[] = [];
    try { imageDataUrls = JSON.parse(sessionStorage.getItem(`renoai.analysis-images.${requestId}`) || "[]") as string[]; }
    catch { imageDataUrls = []; }

    fetch("/api/problem-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_id: request.id,
        property: localStore.selectedProperty(),
        description: request.description,
        category_hint: request.category_hint,
        image_data_urls: imageDataUrls.slice(0, MAX_REPAIR_PHOTOS),
      }),
    })
      .then(async (response) => {
        const analysis = await readRepairResponse(response, "Unable to prepare your brief.");
        await waitForAnimation();
        sessionStorage.removeItem(`renoai.analysis-images.${requestId}`);
        localStore.saveRequest({
          ...request,
          analysis,
          status: analysis.is_complete ? "review" : "collecting_info",
        });
        router.replace(analysis.is_complete ? `/repair/${requestId}/review` : `/repair/${requestId}/clarify`);
      })
      .catch((error: Error) => setError(error.message));
  }, [localStore, requestId, router, stage]);

  const firstPhoto = item?.evidence.photos[0];

  return (
    <main className="brief-shell ai-processing-shell">
      <header className="ai-detect-header">
        <Image src="/brand/renoai-mark.png" alt="RenoAI" width={38} height={38} priority />
        <span className="ai-detect-edit" aria-hidden><SquarePen size={22} strokeWidth={1.8} /></span>
      </header>
      <section className="ai-processing-content" aria-live="polite">
        <div className="ai-detect-message">
          {firstPhoto ? <img src={firstPhoto.thumbnail_url || firstPhoto.storage_url} alt="Repair evidence" /> : <span aria-hidden />}
          <p>{item?.description || "Preparing your repair request..."}</p>
        </div>
        <div className="ai-detect-card">
          <div className="ai-detect-photo">
            {firstPhoto ? <img src={firstPhoto.thumbnail_url || firstPhoto.storage_url} alt="Repair being analysed" /> : <span aria-hidden />}
            <i className="ai-scan-line" aria-hidden />
          </div>
          <h1 key={error ? "error" : `heading-${phase}`}>{error ? "Analysis paused" : phaseHeadings[phase]}</h1>
          {error
            ? <div className="ai-processing-error" role="alert"><p>{error}</p><button className="secondary-btn" type="button" onClick={() => router.replace(stage === "project" ? `/repair/${requestId}/review` : "/home")}>{stage === "project" ? "Back to review" : "Back to Home"}</button></div>
            : <><p className="ai-processing-phase" key={`phase-${phase}`}>{phases[phase]}…</p>
              <div className="ai-progress-dots" aria-label="Analysis in progress"><i /><i /><i /></div></>}
        </div>
      </section>
    </main>
  );
}
