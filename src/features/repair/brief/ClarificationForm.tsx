"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { RepairRequest } from "@/features/account-data/store";
import { useLocalStore } from "@/features/account-data/context";
import type { ProblemAnalysis } from "@/schemas/problem-brief.schema";
import { MAX_CLARIFICATION_ANSWER_LENGTH } from "@/lib/repair-limits";
import { postRepair } from "../api";
import { useRepairRequest } from "../use-repair-request";
import { ProblemBriefCard } from "./ProblemBriefCard";
import { RepairIntakeMessage } from "./RepairIntakeMessage";

export function ClarificationForm({ requestId }: { requestId: string }) {
  const localStore = useLocalStore();
  const router = useRouter();
  const [item, setItem] = useRepairRequest(requestId);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  useEffect(() => {
    if (item?.analysis && item.analysis.missing_questions.length === 0) {
      router.replace(`/repair/${requestId}/review`);
    }
  }, [item, requestId, router]);

  if (!item?.analysis) {
    return (
      <main className="brief-shell analysis-review-page agent-flow-page">
        <div className="requests-empty">Request not found.</div>
      </main>
    );
  }

  const request = item;
  const { analysis: currentAnalysis, id, description, category_hint, clarification_history, evidence } = item;
  const questions = currentAnalysis.missing_questions;
  const currentQuestion = questions[questionIndex];
  const currentAnswer = answers[questionIndex] ?? "";

  async function submitAnswers() {
    setBusy(true);
    setError("");
    const newAnswers = questions.map((question, index) => ({ question, answer: (answers[index] ?? "").trim() }));
    const history = [...(clarification_history ?? []), ...newAnswers];

    try {
      const analysis = await postRepair<ProblemAnalysis>("/api/clarify", {
        request_id: id,
        property: localStore.selectedProperty(),
        description,
        category_hint,
        existing_problem_brief: currentAnalysis.problem_brief,
        clarification_history: history,
        clarification: newAnswers.map(({ question, answer }) => `${question}: ${answer}`).join("\n"),
      }, "We couldn't update the brief.");
      const next: RepairRequest = {
        ...request,
        analysis,
        clarification_history: history,
        status: analysis.is_complete ? "review" : "collecting_info",
      };
      localStore.saveRequest(next);
      if (analysis.is_complete) {
        router.replace(`/repair/${id}/review`);
        return;
      }
      setItem(next);
      setAnswers({});
      setQuestionIndex(0);
      setBusy(false);
    } catch (error) {
      setBusy(false);
      setError(error instanceof Error ? error.message : "We couldn't update the brief.");
    }
  }

  function continueQuestion(event: React.FormEvent) {
    event.preventDefault();
    if (!currentAnswer.trim() || busy) return;
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }
    void submitAnswers();
  }

  return (
    <main className="brief-shell analysis-review-page agent-flow-page clarification-page">
      <div className="clarification-background" aria-hidden="true">
        <RepairIntakeMessage description={description} photos={evidence.photos} imageAlt="" />
        <ProblemBriefCard variant="analysis" brief={currentAnalysis.problem_brief} photos={evidence.photos} />
      </div>

      <div className="clarification-overlay">
        <form className="clarification-sheet" onSubmit={continueQuestion} role="dialog" aria-modal="true" aria-labelledby="clarification-question">
          <div className="clarification-handle" aria-hidden />
          <div className="clarification-sheet-head">
            <div>
              <p>Help us fill the gap</p>
              <span>Question {questionIndex + 1} of {questions.length}</span>
            </div>
            <div className="clarification-progress" aria-hidden>{questions.map((_, index) => <i className={index <= questionIndex ? "active" : ""} key={index} />)}</div>
          </div>

          <section className="clarification-question-wrap" key={currentQuestion}>
            <h1 id="clarification-question">{currentQuestion}</h1>
            <p>Answer only what you know. A short response is enough.</p>
            <textarea autoFocus aria-label="Your answer" placeholder="Type your answer..." maxLength={MAX_CLARIFICATION_ANSWER_LENGTH} value={currentAnswer} onChange={(event) => setAnswers((current) => ({ ...current, [questionIndex]: event.target.value }))} />
          </section>

          {error && <div className="clarification-error"><p role="alert">{error}</p><button className="secondary-btn" type="button" onClick={() => router.replace(`/repair/${requestId}/review`)}>Review current brief</button></div>}
          <div className="clarification-actions">
            {questionIndex > 0 && <button className="clarification-back" type="button" onClick={() => setQuestionIndex((index) => index - 1)}><ArrowLeft size={17} /> Back</button>}
            <button className="clarification-continue" type="submit" disabled={!currentAnswer.trim() || busy}>
              {busy ? "Updating..." : questionIndex === questions.length - 1 ? "Update brief" : "Continue"}
              {!busy && <ArrowRight size={17} />}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
