import { useEffect, useRef } from "react";
import { CloseButton } from "@heroui/react";

interface ImageThumbnailProps {
  file: File;
  isCover: boolean;
  onRemove: () => void;
}

// Vista prèvia local d'una imatge triada, abans de pujar-la.
export default function ImageThumbnail({ file, isCover, onRemove }: ImageThumbnailProps) {
  const image = useRef<HTMLImageElement>(null);

  // L'adreça temporal es crea i s'allibera amb l'efecte (en treure la imatge o sortir del
  // formulari) i s'assigna directament a la imatge, sense passar per l'estat.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    if (image.current) image.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="relative h-24 w-32 overflow-hidden rounded-lg border border-border bg-muted/20">
      <img ref={image} alt={file.name} className="size-full object-cover" />
      {isCover && (
        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-warning px-1.5 py-0.5 text-xs font-semibold text-warning-foreground">
          Portada
        </span>
      )}
      <CloseButton aria-label={`Eliminar ${file.name}`} className="absolute right-1.5 top-1.5" onPress={onRemove} />
    </div>
  );
}
