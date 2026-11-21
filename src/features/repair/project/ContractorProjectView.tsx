"use client";

import { Download } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProblemBriefCard } from "../brief/ProblemBriefCard";
import { useRepairRequest } from "../use-repair-request";

export function ContractorProjectView({ requestId }: { requestId: string }) {
  const [request] = useRepairRequest(requestId);
  const project = request?.project;
  if (!project) return <AppShell><div className="empty">Project not found.</div></AppShell>;

  const { problem, repair, pricing, evidence } = project;
  const details = [
    ["Estimated duration", repair.estimated_duration],
    ["Site visit required", repair.site_visit_required ? "Yes" : "No"],
    ["Confidence", repair.confidence],
    ["Estimated price", pricing.available ? `S$${pricing.estimated_min_price} – S$${pricing.estimated_max_price}` : "Unavailable"],
  ];

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <div className="eyebrow">Contractor project brief</div>
          <h1>{problem.location} · {problem.affected_item}</h1>
          <p className="muted">Reference {project.request_id}</p>
        </div>
        <button className="secondary-btn no-print" type="button" onClick={() => window.print()}><Download size={16} /> Save PDF</button>
      </div>
      <div className="stack">
        <section>
          <div className="section-label">PROPERTY &amp; PROBLEM CONTEXT</div>
          <ProblemBriefCard brief={problem} />
        </section>
        <div className="two-col">
          <section className="card">
            <div className="section-label">LIKELY ISSUE</div>
            <h2>{repair.likely_issue}</h2>
            <p><span className="badge">{repair.urgency} urgency</span></p>
          </section>
          <section className="card">
            <div className="section-label">RECOMMENDED WORK</div>
            <p style={{ fontSize: 18, lineHeight: 1.55 }}>{repair.recommended_work}</p>
          </section>
        </div>
        <div className="detail-list">
          {details.map(([label, value]) => (
            <div className="detail" key={label}><small>{label}</small><strong>{value}</strong></div>
          ))}
        </div>
        <section className="card">
          <div className="section-label">EVIDENCE</div>
          <strong>{evidence.photos.length} photo(s) · {evidence.videos.length} video(s)</strong>
          {evidence.videos.length > 0 && <p className="muted">Video evidence available in the digital project.</p>}
        </section>
      </div>
    </AppShell>
  );
}
