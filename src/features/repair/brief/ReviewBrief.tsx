"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Pencil } from "lucide-react";
import { useLocalStore } from "@/features/account-data/context";
import type { ProblemBrief } from "@/schemas/problem-brief.schema";
import { useRepairRequest } from "../use-repair-request";
import { RepairIntakeMessage } from "./RepairIntakeMessage";
import { ProblemBriefCard } from "./ProblemBriefCard";

const editFields = ["location", "affected_item", "observed_problem", "duration", "condition", "customer_goal"] as const;

export function ReviewBrief({ requestId }: { requestId: string }) {
  const localStore = useLocalStore();
  const router = useRouter();
  const [request, setRequest] = useRepairRequest(requestId);
  const [draft, setDraft] = useState<ProblemBrief>();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!request?.analysis) {
    return (
      <main className="brief-shell analysis-review-page agent-flow-page">
        <div className="requests-empty">Request not found.</div>
      </main>
    );
  }

  const { analysis, description, evidence } = request;
  const brief = draft ?? analysis.problem_brief;
  const updatedRequest = { ...request, analysis: { ...analysis, problem_brief: brief } };

  function save() {
    localStore.saveRequest(updatedRequest);
    setRequest(updatedRequest);
    setDraft(undefined);
    setEditing(false);
  }

  function confirm() {
    localStore.saveRequest({ ...updatedRequest, status: "analysing" });
    router.push(`/repair/${requestId}/processing?stage=project`);
  }

  return (
    <main className="brief-shell analysis-review-page agent-flow-page" data-node-id="104:192">
      <RepairIntakeMessage description={description} photos={evidence.photos} />
      <ProblemBriefCard
        variant="analysis"
        brief={brief}
        photos={evidence.photos}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
        footer={!editing && (
          <div className="analysis-review-actions analysis-card-actions">
            <button className="analysis-edit-button" type="button" onClick={() => setEditing(true)}><Pencil size={14} /> Edit</button>
            <button className="analysis-confirm-button" type="button" onClick={confirm}>Continue <ArrowRight size={14} /></button>
          </div>
        )}
      />
      {editing && (
        <section className="analysis-edit-panel">
          {editFields.map((field) => (
            <label key={field}>
              <span>{field.replaceAll("_", " ")}</span>
              <textarea
                rows={field === "observed_problem" ? 3 : 2}
                value={brief[field] || ""}
                onChange={(event) => setDraft({ ...brief, [field]: event.target.value })}
              />
            </label>
          ))}
          <div className="analysis-review-actions">
            <button className="analysis-edit-button" type="button" onClick={() => setEditing(false)}>Cancel</button>
            <button className="analysis-confirm-button" type="button" onClick={save}>Save changes</button>
          </div>
        </section>
      )}
    </main>
  );
}
