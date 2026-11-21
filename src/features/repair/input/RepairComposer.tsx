"use client";

import { useRef, useState, type ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, BrickWall, DoorClosed, Droplet, Grid2X2, LoaderCircle, Mic, Plus, Square, X, Zap } from "lucide-react";
import { saveAnalysisImages } from "@/features/repair/analysis-images";
import { useLocalStore } from "@/features/account-data/context";
import { MAX_REPAIR_DESCRIPTION_LENGTH } from "@/lib/repair-limits";
import { cn, newId } from "@/lib/utils";
import { RepairAttachments } from "./RepairAttachments";
import { appendAttachments, prepareRepairEvidence, type AttachmentSelection } from "./repair-evidence";
import { useVoiceInput } from "./useVoiceInput";

const categories = [
  { label: "Water", sub: "Leak", icon: Droplet, tint: "#3b82f6" },
  { label: "Electrical", sub: "Power issue", icon: Zap, tint: "#f59e0b" },
  { label: "Door / Cabinet", sub: "Woodwork", icon: DoorClosed, tint: "#1e2939" },
  { label: "Wall / Ceiling", sub: "Crack, stain", icon: BrickWall, tint: "#0f766e" },
  { label: "Tiles / Floor", sub: "Tiles, floor", icon: Grid2X2, tint: "#6b7280" },
];

export function RepairComposer() {
  const localStore = useLocalStore();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>();
  const [{ attachments, error }, setSelection] = useState<AttachmentSelection>({ attachments: [], error: "" });
  const [busy, setBusy] = useState(false);
  const { listening, start, stop } = useVoiceInput(setDescription);
  const trimmedDescription = description.trim();

  function addFiles(files: File[]) {
    if (busy || !files.length) return;
    const additions = files.map((file) => ({ id: newId("attachment"), file }));
    setSelection((selection) => appendAttachments(selection.attachments, additions));
  }

  function removeAttachment(id: string) {
    setSelection((selection) => ({
      attachments: selection.attachments.filter((attachment) => attachment.id !== id),
      error: "",
    }));
  }

  function pasteImages(event: ClipboardEvent<HTMLTextAreaElement>) {
    const images = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
    if (!images.length) return;
    if (!event.clipboardData.getData("text/plain")) event.preventDefault();
    addFiles(images);
  }

  async function submit() {
    if (!trimmedDescription || busy) return;
    setBusy(true);
    setSelection((selection) => ({ ...selection, error: "" }));
    const id = newId("request");
    try {
      const { evidence, imageDataUrls } = await prepareRepairEvidence(id, attachments);
      saveAnalysisImages(id, imageDataUrls);
      localStore.saveRequest({
        id,
        property_id: localStore.selectedProperty().id,
        description: trimmedDescription,
        category_hint: category,
        status: "analysing",
        created_at: new Date().toISOString(),
        evidence,
      });
      router.push(`/repair/${id}/processing`);
    } catch (uploadError) {
      setBusy(false);
      setSelection((selection) => ({
        ...selection,
        error: uploadError instanceof Error ? uploadError.message : "We couldn't upload the evidence. Please try again.",
      }));
    }
  }

  function handlePrimaryAction() {
    if (busy) return;
    if (listening) {
      stop();
      return;
    }
    if (trimmedDescription) {
      void submit();
      return;
    }
    start(description);
  }

  return (
    <>
      <section className="composer-card">
        <RepairAttachments
          attachments={attachments}
          disabled={busy}
          inputRef={fileRef}
          onAdd={addFiles}
          onRemove={removeAttachment}
        />
        {category && (
          <div className="composer-selected-issue" role="status">
            <span>{category}</span>
            <button type="button" aria-label={`Remove ${category} issue type`} onClick={() => setCategory(undefined)}>
              <X size={14} strokeWidth={1.8} />
            </button>
          </div>
        )}
        <textarea
          className="composer-textarea"
          aria-label="Describe the repair"
          placeholder="Describe the repair. You can paste a photo here."
          maxLength={MAX_REPAIR_DESCRIPTION_LENGTH}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onPaste={pasteImages}
        />
        {error && <p className="composer-error" role="alert">{error}</p>}
        <div className="composer-toolbar">
          <button className="composer-icon-btn" type="button" aria-label="Add attachment" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Plus size={18} />
          </button>
          <div className="composer-voice-action">
            {listening && <span className="composer-listening-copy" role="status">Listening…</span>}
            <button
              className={cn("composer-mic-btn", listening && "listening")}
              type="button"
              disabled={busy}
              onClick={handlePrimaryAction}
              aria-label={listening ? "Stop voice input" : trimmedDescription ? "Send repair description" : "Start voice input"}
            >
              {busy
                ? <LoaderCircle className="spin" size={17} />
                : listening
                  ? <Square size={12} fill="currentColor" />
                  : trimmedDescription
                    ? <ArrowUp size={18} strokeWidth={2} />
                    : <Mic size={17} />}
            </button>
          </div>
        </div>
      </section>
      <section className="issue-section" aria-label="Choose likely issue">
        <div className="issue-label">Choose likely issue</div>
        <div className="issue-row">
          {categories.map(({ label, sub, icon: Icon, tint }) => (
            <button
              type="button"
              key={label}
              aria-pressed={category === label}
              className={cn("issue-chip", category === label && "active")}
              onClick={() => setCategory(category === label ? undefined : label)}
            >
              <Icon aria-hidden size={22} color={tint} strokeWidth={1.75} />
              <span><strong>{label}</strong><small>{sub}</small></span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
