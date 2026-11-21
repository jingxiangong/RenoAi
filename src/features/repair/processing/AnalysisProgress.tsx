"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SquarePen } from "lucide-react";
import type { RepairRequest } from "@/features/account-data/store";
import { useLocalStore } from "@/features/account-data/context";
import { clearAnalysisImages } from "../analysis-images";
import { runAnalysis, type AnalysisStage } from "./analysis-workflow";

const phasesByStage = {
  problem: [
    ["Starting the image analysis", "Reading your photos and description"],
    ["Detecting the repair issue", "Identifying the affected area and item"],
    ["Building your repair brief", "Preparing your repair brief"],
  ],
  project: [
    ["Starting the repair analysis", "Checking the likely repair method"],
    ["Checking repair and pricing", "Comparing duration and price guidance"],
    ["Finishing your repair plan", "Preparing your final repair plan"],
  ],
};

export function AnalysisProgress({ requestId, stage }: { requestId: string; stage: AnalysisStage }) {
  const localStore = useLocalStore();
  const router = useRouter();
  const job = useRef<Promise<string> | null>(null);
  const [item, setItem] = useState<RepairRequest>();
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState("");
  const phases = phasesByStage[stage];
  const [heading, detail] = phases[phase];

  useEffect(() => {
    if (error) return;
    const timer = window.setInterval(() => setPhase((value) => (value + 1) % phases.length), 900);
    return () => window.clearInterval(timer);
  }, [error, phases.length]);

  useEffect(() => {
    const request = localStore.request(requestId);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser storage is read after hydration.
    setItem(request);
    if (!request) {
      setError("Request not found.");
      return;
    }

    let active = true;
    if (!job.current) {
      const start = Date.now();
      job.current = runAnalysis(stage, request, localStore.selectedProperty()).then(async (update) => {
        const remaining = 2_200 - (Date.now() - start);
        if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
        if (stage === "problem") clearAnalysisImages(requestId);
        localStore.saveRequest(update.request);
        return `/repair/${requestId}/${update.destination}`;
      });
    }
    // Reuse the same analysis if React re-runs the effect in development.
    void job.current
      .then((destination) => { if (active) router.replace(destination); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Analysis could not be completed.");
      });

    return () => { active = false; };
  }, [localStore, requestId, router, stage]);

  const firstPhoto = item?.evidence.photos[0];
  const photoUrl = firstPhoto?.thumbnail_url || firstPhoto?.storage_url;
  const backTo = stage === "project" ? `/repair/${requestId}/review` : "/home";

  return (
    <main className="brief-shell ai-processing-shell">
      <header className="ai-detect-header">
        <Image src="/brand/renoai-mark.png" alt="RenoAI" width={38} height={38} priority />
        <span className="ai-detect-edit" aria-hidden><SquarePen size={22} strokeWidth={1.8} /></span>
      </header>
      <section className="ai-processing-content" aria-live="polite">
        <div className="ai-detect-message">
          {photoUrl ? <img src={photoUrl} alt="Repair evidence" /> : <span aria-hidden />}
          <p>{item?.description || "Preparing your repair request..."}</p>
        </div>
        <div className="ai-detect-card">
          <div className="ai-detect-photo">
            {photoUrl ? <img src={photoUrl} alt="Repair being analysed" /> : <span aria-hidden />}
            <i className="ai-scan-line" aria-hidden />
          </div>
          <h1 key={error ? "error" : `heading-${phase}`}>{error ? "Analysis paused" : heading}</h1>
          {error ? (
            <div className="ai-processing-error" role="alert">
              <p>{error}</p>
              <button className="secondary-btn" type="button" onClick={() => router.replace(backTo)}>
                {stage === "project" ? "Back to review" : "Back to Home"}
              </button>
            </div>
          ) : (
            <>
              <p className="ai-processing-phase" key={`phase-${phase}`}>{detail}…</p>
              <div className="ai-progress-dots" aria-label="Analysis in progress"><i /><i /><i /></div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
