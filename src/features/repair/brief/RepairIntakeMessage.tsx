import type { MediaItem } from "@/schemas/project-brief.schema";

export function RepairIntakeMessage({
  description,
  photos,
  imageAlt = "Repair evidence",
}: {
  description: string;
  photos: MediaItem[];
  imageAlt?: string;
}) {
  const [firstPhoto, ...remainingPhotos] = photos;

  return (
    <div className="analysis-user-message">
      {firstPhoto ? (
        <span className="analysis-message-photo">
          <img src={firstPhoto.thumbnail_url || firstPhoto.storage_url} alt={imageAlt} />
          {remainingPhotos.length > 0 && <i>+{remainingPhotos.length}</i>}
        </span>
      ) : (
        <span className="analysis-message-photo" aria-hidden />
      )}
      <p>{description}</p>
    </div>
  );
}
