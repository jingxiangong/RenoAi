import { useEffect, useRef, type RefObject } from "react";
import { Plus, Video, X } from "lucide-react";
import type { RepairAttachment } from "./repair-evidence";

function AttachmentPreview({ file, onRemove, disabled }: {
  file: File;
  onRemove: () => void;
  disabled: boolean;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const isPhoto = file.type.startsWith("image/");

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const url = URL.createObjectURL(file);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="composer-attachment">
      {isPhoto
        ? <img ref={imageRef} className="composer-thumb" alt={file.name} />
        : <div className="composer-video"><Video aria-hidden size={22} /><span>Video</span></div>}
      <button
        className="composer-remove-attachment"
        type="button"
        aria-label={`Remove ${file.name}`}
        onClick={onRemove}
        disabled={disabled}
      >
        <X aria-hidden size={13} />
      </button>
    </div>
  );
}

export function RepairAttachments({ attachments, disabled, inputRef, onAdd, onRemove }: {
  attachments: RepairAttachment[];
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="composer-photos">
      <button
        className="composer-add"
        type="button"
        aria-label="Add photos or video"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Plus size={25} strokeWidth={1.7} />
        <span>Add</span>
      </button>
      {attachments.map(({ id, file }) => (
        <AttachmentPreview key={id} file={file} disabled={disabled} onRemove={() => onRemove(id)} />
      ))}
      <input
        ref={inputRef}
        hidden
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(event) => {
          onAdd(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </div>
  );
}
