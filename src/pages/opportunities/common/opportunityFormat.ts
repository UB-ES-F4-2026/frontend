import type { Promoter } from "../../../store/useOpportunityStore";
import type { GalleryImage } from "./OpportunityGallery";

// Format compartit pels detalls d'oportunitat (immobiliària i empresarial).

// Las fechas se muestran siempre en la hora de la plataforma, no en la del navegador.
const PLATFORM_TIME_ZONE = "Europe/Madrid";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const percent = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat("es-ES");
const dateFormat = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeZone: PLATFORM_TIME_ZONE,
});
const dateTimeFormat = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: PLATFORM_TIME_ZONE,
});
const offsetFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: PLATFORM_TIME_ZONE,
  timeZoneName: "longOffset",
});

export const formatCents = (cents: number) => eur.format(cents / 100);

// `ratio` és una fracció: 0,65 es mostra com «65,0 %».
export const formatRatio = (ratio: number) => percent.format(ratio);

export const formatInteger = (value: number) => integer.format(value);

export const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
};

export const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
};

export const utcOffsetLabel = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = offsetFormat
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  return offset ? offset.replace("GMT", "UTC") : "";
};

// Primer párrafo -> entradilla del hero; el resto -> "Resumen del proyecto".
// Si solo hay un párrafo, se muestra únicamente en el resumen.
export const splitDescription = (description: string) => {
  const paragraphs = description
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const hasIntro = paragraphs.length > 1;
  return {
    intro: hasIntro ? paragraphs[0] : null,
    summary: hasIntro ? paragraphs.slice(1) : paragraphs,
  };
};

interface GallerySource {
  title: string;
  cover_image_url: string | null;
  promoter: Promoter;
}

// Sense imatges pròpies, la galeria recorre a la portada i a la imatge del promotor.
export const buildGalleryImages = (
  opportunity: GallerySource,
  images: string[] | null = null,
): GalleryImage[] => {
  if (images && images.length > 0) {
    return images.map((image, index) => ({
      src: image,
      alt: `Imagen ${index + 1} de ${opportunity.title}`,
    }));
  }
  const fallback: GalleryImage[] = [];
  if (opportunity.cover_image_url) {
    fallback.push({ src: opportunity.cover_image_url, alt: `Imagen de ${opportunity.title}` });
  }
  if (opportunity.promoter.image_url) {
    fallback.push({
      src: opportunity.promoter.image_url,
      alt: `Imagen de ${opportunity.promoter.legal_name}`,
    });
  }
  return fallback;
};
