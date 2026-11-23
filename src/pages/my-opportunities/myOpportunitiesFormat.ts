import type { FundingStatus, OpportunityType, PromoterOpportunity } from "../../store/useOpportunityStore";

export const FUNDING_STATUS_LABELS: Record<FundingStatus, string> = {
  pending_review: "Pendiente de revisión",
  in_funding: "En financiación",
  funded: "Financiación completada",
  expired: "Plazo finalizado",
  closed: "Oportunidad cerrada",
  // El backend no llista les rebutjades; es cobreix per si n'arriba alguna.
  rejected: "Rechazada",
};

// Color del punt de cada estat (tokens semàntics de HeroUI).
export const FUNDING_STATUS_DOTS: Record<FundingStatus, string> = {
  pending_review: "bg-accent",
  in_funding: "bg-warning",
  funded: "bg-success",
  expired: "bg-muted",
  closed: "bg-muted",
  rejected: "bg-danger",
};

export const TYPE_LABELS: Record<OpportunityType, string> = {
  real_estate: "Inmobiliaria",
  equity: "Empresarial",
};

// Les dates es mostren en l'hora de la plataforma, com als detalls: «2 nov 2026».
const shortDate = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

export const formatShortDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : shortDate.format(date);
};

// «Publicada el 2 nov 2026», o «Creada el …» mentre està pendent de revisió.
export const publicationLabel = (opportunity: PromoterOpportunity) =>
  opportunity.date_published
    ? `Publicada el ${formatShortDate(opportunity.date_published)}`
    : `Creada el ${formatShortDate(opportunity.created_at)}`;

export const detailPath = (opportunity: PromoterOpportunity) =>
  opportunity.type === "real_estate"
    ? `/opportunities/real-estate/${opportunity.id}`
    : `/opportunities/equity/${opportunity.id}`;

// Part de l'objectiu ja compromesa; pot superar 1 si s'ha compromès més que l'objectiu.
export const fundingRatio = (opportunity: PromoterOpportunity) =>
  opportunity.target_amount_cents > 0 ? opportunity.committed_cents / opportunity.target_amount_cents : 0;
