import { useId, useState, type ChangeEvent } from "react";
import { ACCEPTED_IMAGE_TYPES, checkImage } from "./opportunityDraft";
import ImageThumbnail from "./ImageThumbnail";
import { ERROR_CLASS, HELP_CLASS, LABEL_CLASS } from "./formStyles";

interface ImagePickerProps {
  images: File[];
  onChange: (images: File[]) => void;
  // Error de validació del pas («Añade al menos una imagen.»).
  error?: string;
}

// Identificador estable per fitxer, perquè eliminar una imatge no torni a crear les altres.
const fileKeys = new WeakMap<File, number>();
let nextFileKey = 0;
const keyOf = (file: File) => {
  if (!fileKeys.has(file)) fileKeys.set(file, nextFileKey++);
  return fileKeys.get(file);
};

// Imatges de l'oportunitat: s'afegeixen al final i la primera és la portada.
export default function ImagePicker({ images, onChange, error }: ImagePickerProps) {
  const id = useId();
  // Fitxers descartats en l'última selecció, amb el motiu.
  const [rejected, setRejected] = useState<string[]>([]);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const accepted: File[] = [];
    const reasons: string[] = [];
    for (const file of Array.from(event.target.files ?? [])) {
      const reason = checkImage(file);
      if (reason) reasons.push(reason);
      else accepted.push(file);
    }
    setRejected(reasons);
    if (accepted.length > 0) onChange([...images, ...accepted]);
    // Permet tornar a triar el mateix fitxer després d'eliminar-lo.
    event.target.value = "";
  };

  const remove = (index: number) => {
    setRejected([]);
    onChange(images.filter((_, position) => position !== index));
  };

  const messages = [...(error ? [error] : []), ...rejected];

  return (
    <div role="group" aria-labelledby={`${id}-label`} className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className={LABEL_CLASS}>Imágenes</span>
      <ul className="flex flex-wrap gap-3">
        {images.map((file, index) => (
          <li key={keyOf(file)}>
            <ImageThumbnail file={file} isCover={index === 0} onRemove={() => remove(index)} />
          </li>
        ))}
        <li>
          <label
            htmlFor={`${id}-input`}
            className="flex h-24 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-foreground/20 text-sm text-muted transition-colors hover:border-warning hover:text-foreground has-[:focus-visible]:border-warning"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Añadir imágenes
            <input
              id={`${id}-input`}
              type="file"
              multiple
              aria-label="Añadir imágenes"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              aria-describedby={`${id}-help${messages.length > 0 ? ` ${id}-error` : ""}`}
              aria-invalid={messages.length > 0 || undefined}
              className="sr-only"
              onChange={handleFiles}
            />
          </label>
        </li>
      </ul>
      <p id={`${id}-help`} className={HELP_CLASS}>
        Al menos una imagen. JPG, PNG o WebP de hasta 5 MB. La primera imagen será la portada.
      </p>
      {messages.length > 0 && (
        <ul id={`${id}-error`} className={ERROR_CLASS}>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
