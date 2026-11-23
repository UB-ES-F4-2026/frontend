import { formatEuroCents, parseEuroAmount } from "../../../../service/money";
import type { BusinessCreate, BusinessPhase, BusinessSector } from "../../../../store/useOpportunityStore";
import { PHASE_LABELS, SECTOR_LABELS } from "../../../opportunities/common/businessLabels";
import { formatRatio } from "../../../opportunities/common/opportunityFormat";
import { INVALID_AMOUNT_MESSAGE } from "../../../opportunities/dialogs/contributionAmount";

// Pas «Empresa» (US06.1.2). Les regles copien BusinessOpportunityCreate del backend, que les
// torna a validar en enviar.

export interface BusinessDraft {
  // "" fins que es tria una opció.
  sector: BusinessSector | "";
  phase: BusinessPhase | "";
  // Import com l'escriu l'usuari («1.350.000,00»).
  valuation: string;
}

export type BusinessField = keyof BusinessDraft;
export type BusinessErrors = Partial<Record<BusinessField, string>>;

export const EMPTY_BUSINESS: BusinessDraft = { sector: "", phase: "", valuation: "" };

const parseValuation = (text: string): { cents: number } | { error: string } => {
  const parsed = parseEuroAmount(text);
  if ("error" in parsed) {
    if (parsed.error === "empty") return { error: "Introduce la valoración previa a la inversión." };
    if (parsed.error === "decimals") return { error: "El importe no puede tener más de dos decimales." };
    return { error: INVALID_AMOUNT_MESSAGE };
  }
  if (parsed.cents <= 0) return { error: "La valoración previa debe ser mayor que 0." };
  return { cents: parsed.cents };
};

// Valoració en cèntims, o null si el camp encara no té un import vàlid.
export const valuationCents = (draft: BusinessDraft) => {
  const valuation = parseValuation(draft.valuation);
  return "cents" in valuation ? valuation.cents : null;
};

export const validateBusiness = (draft: BusinessDraft): BusinessErrors => {
  const errors: BusinessErrors = {};
  if (!draft.sector) errors.sector = "Selecciona el sector.";
  if (!draft.phase) errors.phase = "Selecciona la fase de la empresa.";
  const valuation = parseValuation(draft.valuation);
  if ("error" in valuation) errors.valuation = valuation.error;
  return errors;
};

export const toBusinessPayload = (draft: BusinessDraft): { business: BusinessCreate } => ({
  business: {
    sector: draft.sector as BusinessSector,
    phase: draft.phase as BusinessPhase,
    pre_investment_valuation_cents: valuationCents(draft) ?? 0,
  },
});

// Participació oferta = objectiu ÷ (valoració prèvia + objectiu), la mateixa fórmula que el backend.
export const equityOffered = (valuation: number, target: number) => target / (valuation + target);

// «10,0 %», o «—» mentre falti l'objectiu o la valoració.
export const formatEquityOffered = (draft: BusinessDraft, targetCents: number | null) => {
  const valuation = valuationCents(draft);
  return valuation !== null && targetCents !== null && targetCents > 0
    ? formatRatio(equityOffered(valuation, targetCents))
    : "—";
};

// Files del resum de «Revisión», a la secció «Empresa».
export const businessSummary = (draft: BusinessDraft): [string, string][] => {
  const valuation = valuationCents(draft);
  return [
    ["Sector · Fase", [draft.sector && SECTOR_LABELS[draft.sector], draft.phase && PHASE_LABELS[draft.phase]].join(" · ")],
    ["Valoración previa a la inversión", valuation !== null ? formatEuroCents(valuation) : "—"],
  ];
};

// Files que depenen de l'objectiu de finançament: al pas «Financiación» i a la seva secció del resum.
export const businessFundingSummary = (draft: BusinessDraft, targetCents: number | null): [string, string][] => [
  ["Participación ofrecida", formatEquityOffered(draft, targetCents)],
];
