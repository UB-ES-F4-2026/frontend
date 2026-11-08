import { Button } from "@heroui/react";
import { useRef, useState, type KeyboardEvent } from "react";
import Icon from "./OpportunityIcon";

const FOCUS_RING =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

export interface GalleryImage {
  src: string;
  alt: string;
}

const IMAGE_HEIGHT = "h-[280px] min-[960px]:h-[355px]";

const Gallery = ({ images }: { images: GalleryImage[] }) => {
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<number>>(new Set());
  const [zoomed, setZoomed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const total = images.length;
  
  if (total === 0) {
    return (
      <div
        className={`grid ${IMAGE_HEIGHT} place-content-center rounded-[10px] bg-muted/10 text-sm text-muted`}
      >
        Imagen no disponible
      </div>
    );
  }

  const current = images[selected];
  const isFailed = failed.has(selected);
  const counter = `Imagen ${selected + 1} de ${total}`;

  const step = (delta: number) => setSelected((index) => (index + delta + total) % total);
  const markFailed = (index: number) => setFailed((prev) => new Set(prev).add(index));

  const openDialog = () => {
    setZoomed(true);
    dialogRef.current?.showModal();
  };

  const handleDialogClose = () => {
    setZoomed(false);
    (failed.has(selected) ? thumbRefs.current[selected] : openerRef.current)?.focus();
  };

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    }
  };

  return (
    <figure>
      <div className="relative min-w-0">
        <button
          ref={openerRef}
          type="button"
          disabled={isFailed}
          onClick={openDialog}
          aria-haspopup="dialog"
          aria-label={isFailed ? "Imagen no disponible" : `Ampliar imagen ${selected + 1} de ${total}`}
          className={`block w-full cursor-zoom-in overflow-hidden rounded-[10px] bg-muted/10 p-0 disabled:cursor-default ${FOCUS_RING}`}
        >
          {isFailed ? (
            <span className={`grid ${IMAGE_HEIGHT} place-content-center p-7 text-sm text-muted`}>
              Imagen no disponible
            </span>
          ) : (
            <img
              key={selected}
              src={current.src}
              alt={current.alt}
              onError={() => markFailed(selected)}
              className={`${IMAGE_HEIGHT} w-full object-cover`}
            />
          )}
        </button>

        {total > 1 && (
          <>
            <Button
              isIconOnly
              variant="secondary"
              aria-label="Imagen anterior"
              onPress={() => step(-1)}
              className="absolute top-1/2 left-3 size-11 min-w-11 -translate-y-1/2 rounded-full shadow-md"
            >
              <Icon name="previous" size={24} />
            </Button>
            <Button
              isIconOnly
              variant="secondary"
              aria-label="Imagen siguiente"
              onPress={() => step(1)}
              className="absolute top-1/2 right-3 size-11 min-w-11 -translate-y-1/2 rounded-full shadow-md"
            >
              <Icon name="next" size={24} />
            </Button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="mt-2.5 flex gap-2.5 overflow-x-auto" aria-label="Seleccionar imagen">
          {images.map((image, index) => (
            <button
              key={image.src}
              ref={(element) => {
                thumbRefs.current[index] = element;
              }}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`Mostrar imagen ${index + 1} de ${total}`}
              aria-current={index === selected}
              className={`shrink-0 cursor-pointer rounded-lg border-2 border-transparent bg-surface p-0.5 aria-[current=true]:border-warning ${FOCUS_RING}`}
            >
              <img
                src={image.src}
                alt=""
                loading="lazy"
                className="h-[76px] w-[120px] rounded bg-muted/10 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span aria-live="polite">{counter}</span>
        {!isFailed && <span>Selecciona la imagen para ampliarla</span>}
      </figcaption>

      <dialog
        ref={dialogRef}
        aria-label="Imagen ampliada del inmueble"
        onClose={handleDialogClose}
        onKeyDown={handleDialogKeyDown}
        className="m-auto max-h-[calc(100svh-32px)] w-[min(1100px,calc(100%-32px))] overflow-auto rounded-xl border border-border bg-surface p-5 text-foreground backdrop:bg-black/80"
      >
        <div className="mb-4 flex justify-end">
          <Button variant="secondary" onPress={() => dialogRef.current?.close()}>
            Cerrar
          </Button>
        </div>
        {zoomed &&
          (isFailed ? (
            <p className="grid min-h-40 place-content-center text-sm text-muted">
              Imagen no disponible
            </p>
          ) : (
            <img
              key={selected}
              src={current.src}
              alt={current.alt}
              onError={() => markFailed(selected)}
              className="block max-h-[70svh] w-full object-contain"
            />
          ))}
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            isIconOnly
            variant="secondary"
            aria-label="Imagen anterior"
            onPress={() => step(-1)}
            isDisabled={total < 2}
            className="size-11 min-w-11 rounded-full"
          >
            <Icon name="previous" size={24} />
          </Button>
          <p className="text-xs text-muted" aria-live="polite">
            {isFailed ? `${counter} · Imagen no disponible` : counter}
          </p>
          <Button
            isIconOnly
            variant="secondary"
            aria-label="Imagen siguiente"
            onPress={() => step(1)}
            isDisabled={total < 2}
            className="size-11 min-w-11 rounded-full"
          >
            <Icon name="next" size={24} />
          </Button>
        </div>
      </dialog>
    </figure>
  );
};

export default Gallery;