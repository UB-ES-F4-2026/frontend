import { formatEuroCents, parseEuroAmount } from "../../../service/money";
import type { OpportunityCreateMetadata, OpportunityType } from "../../../store/useOpportunityStore";
import { INSUFFICIENT_FUNDS_MESSAGE, INVALID_AMOUNT_MESSAGE } from "../../opportunities/dialogs/contributionAmount";

// Dades comunes del formulari de creació (US06.1 i US06.1.2). Els límits copien OpportunityCreate
// i app/core/media.py del backend, que ho torna a validar en enviar.

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TITLE_LENGTH = 255;
const MAX_LOCATION_LENGTH = 100;

export interface GeneralDraft {
  title: string;
  description: string;
  municipality: string;
  province: string;
  country: string;
  // En ordre: la primera és la portada.
  images: File[];
}

export type GeneralField = keyof GeneralDraft;
export type GeneralErrors = Partial<Record<GeneralField, string>>;

export const EMPTY_GENERAL: GeneralDraft = {
  title: "",
  description: "",
  municipality: "",
  province: "",
  country: "",
  images: [],
};

// Imports com els escriu l'usuari («150.000,00») i data límit del camp datetime-local.
export interface FundingDraft {
  target: string;
  minimum: string;
  deadline: string;
  initial: string;
}

export type FundingField = keyof FundingDraft;
export type FundingErrors = Partial<Record<FundingField, string>>;

export const EMPTY_FUNDING: FundingDraft = { target: "", minimum: "", deadline: "", initial: "" };

// Condicions ja validades, en cèntims i amb la data límit en ISO.
export interface FundingValues {
  targetCents: number;
  minimumCents: number;
  deadline: string;
  initialCents: number | null;
}

// Com el backend: es treuen els espais dels extrems i els repetits de la ubicació.
const collapseSpaces = (value: string) => value.split(/\s+/).filter(Boolean).join(" ");

const locationError = (value: string, missing: string) => {
  const normalized = collapseSpaces(value);
  if (!normalized) return missing;
  if (normalized.length > MAX_LOCATION_LENGTH) return `Máximo ${MAX_LOCATION_LENGTH} caracteres.`;
  return undefined;
};

export const validateGeneral = (draft: GeneralDraft): GeneralErrors => {
  const errors: GeneralErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = "Introduce el título.";
  else if (title.length > MAX_TITLE_LENGTH) errors.title = `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres.`;
  if (!draft.description.trim()) errors.description = "Introduce la descripción.";
  const municipality = locationError(draft.municipality, "Introduce el municipio.");
  if (municipality) errors.municipality = municipality;
  const province = locationError(draft.province, "Introduce la provincia.");
  if (province) errors.province = province;
  const country = locationError(draft.country, "Introduce el país.");
  if (country) errors.country = country;
  if (draft.images.length === 0) errors.images = "Añade al menos una imagen.";
  return errors;
};

// Motiu pel qual no s'accepta una imatge triada, o null si és vàlida.
export const checkImage = (file: File): string | null => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return `«${file.name}» no es una imagen JPG, PNG o WebP.`;
  if (file.size > MAX_IMAGE_BYTES) return `«${file.name}» supera los 5 MB.`;
  return null;
};

export const formatLocation = (draft: GeneralDraft) =>
  [draft.municipality, draft.province, draft.country].map(collapseSpaces).join(", ");

// --- Data límit en hora de Madrid -----------------------------------------------------------

// La data límit s'escriu en l'hora de la plataforma, la mateixa amb què es mostra als detalls.
const PLATFORM_TIME_ZONE = "Europe/Madrid";
const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: PLATFORM_TIME_ZONE,
  timeZoneName: "longOffset",
});

// Minuts que Madrid va per davant d'UTC en aquell instant (60 a l'hivern, 120 a l'estiu).
const madridOffsetMinutes = (instant: number) => {
  const name = offsetFormat.formatToParts(instant).find((part) => part.type === "timeZoneName")?.value ?? "";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!match) return 0;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
};

// «2027-01-31T23:59» (hora de Madrid) → «2027-01-31T22:59:00.000Z». null si el text no és una data.
export const madridLocalToIso = (local: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0"] = match;
  const wall = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  if (Number.isNaN(wall)) return null;
  // Primer s'aproxima amb el desfasament de l'hora escrita i després es corregeix amb el de
  // l'instant resultant, per als dies de canvi d'hora.
  const approximate = wall - madridOffsetMinutes(wall) * 60_000;
  return new Date(wall - madridOffsetMinutes(approximate) * 60_000).toISOString();
};

// --- Condicions de finançament ----------------------------------------------------------------

const AMOUNT_FORMAT_ERRORS = {
  invalid: INVALID_AMOUNT_MESSAGE,
  decimals: "El importe no puede tener más de dos decimales.",
} as const;

const parseRequiredAmount = (
  text: string,
  missing: string,
  notPositive: string,
): { error: string } | { cents: number } => {
  const parsed = parseEuroAmount(text);
  if ("error" in parsed) return { error: parsed.error === "empty" ? missing : AMOUNT_FORMAT_ERRORS[parsed.error] };
  if (parsed.cents <= 0) return { error: notPositive };
  return { cents: parsed.cents };
};

// `availableCents` null: no s'ha pogut consultar el saldo.
export const validateFunding = (
  draft: FundingDraft,
  availableCents: number | null,
  now = Date.now(),
): { errors: FundingErrors } | { values: FundingValues } => {
  const errors: FundingErrors = {};

  const target = parseRequiredAmount(draft.target, "Introduce el objetivo de financiación.", "El objetivo de financiación debe ser mayor que 0.");
  if ("error" in target) errors.target = target.error;

  const minimum = parseRequiredAmount(draft.minimum, "Introduce la aportación mínima.", "La aportación mínima debe ser mayor que 0.");
  if ("error" in minimum) errors.minimum = minimum.error;
  else if ("cents" in target && minimum.cents > target.cents) {
    errors.minimum = "La aportación mínima no puede superar el objetivo de financiación.";
  }

  const deadline = draft.deadline ? madridLocalToIso(draft.deadline) : null;
  if (!draft.deadline) errors.deadline = "Indica la fecha límite de financiación.";
  else if (!deadline) errors.deadline = "Introduce una fecha válida.";
  else if (Date.parse(deadline) <= now) errors.deadline = "La fecha límite debe ser posterior a la fecha actual.";

  // L'aportació inicial és opcional; si s'indica, ha d'estar entre el mínim i l'objectiu.
  let initialCents: number | null = null;
  if (draft.initial.trim()) {
    const initial = parseEuroAmount(draft.initial);
    if ("error" in initial) {
      errors.initial = initial.error === "empty" ? undefined : AMOUNT_FORMAT_ERRORS[initial.error];
    } else {
      initialCents = initial.cents;
      if ("cents" in minimum && initial.cents < minimum.cents) {
        errors.initial = `La aportación inicial debe ser de al menos ${formatEuroCents(minimum.cents)}, la aportación mínima.`;
      } else if ("cents" in target && initial.cents > target.cents) {
        errors.initial = "La aportación inicial no puede superar el objetivo de financiación.";
      } else if (availableCents === null) {
        errors.initial = "No se ha podido consultar tu saldo para comprobar la aportación.";
      } else if (initial.cents > availableCents) {
        errors.initial = INSUFFICIENT_FUNDS_MESSAGE;
      }
    }
  }

  if (Object.values(errors).some(Boolean) || !("cents" in target) || !("cents" in minimum) || !deadline) {
    return { errors };
  }
  return {
    values: { targetCents: target.cents, minimumCents: minimum.cents, deadline, initialCents },
  };
};

export const buildMetadata = (
  type: OpportunityType,
  general: GeneralDraft,
  funding: FundingValues,
  specific: Pick<OpportunityCreateMetadata, "real_estate" | "business">,
): OpportunityCreateMetadata => ({
  type,
  title: general.title.trim(),
  description: general.description.trim(),
  location: {
    municipality: collapseSpaces(general.municipality),
    province: collapseSpaces(general.province),
    country: collapseSpaces(general.country),
  },
  target_amount_cents: funding.targetCents,
  minimum_contribution_cents: funding.minimumCents,
  deadline: funding.deadline,
  initial_contribution_cents: funding.initialCents,
  ...specific,
});
