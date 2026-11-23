import { parseEuroAmount } from "../../../../service/money";
import type {
  RealEstateAssetType,
  RealEstateCreate,
  RealEstateIntendedUse,
  RealEstatePurpose,
} from "../../../../store/useOpportunityStore";
import { formatDate } from "../../../opportunities/common/opportunityFormat";

// Pas «Inmueble» (US06.1). Les regles copien RealEstateOpportunityCreate del backend, que les
// torna a validar en enviar.

export const PURPOSE_LABELS: Record<RealEstatePurpose, string> = {
  acquisition: "Adquisición",
  construction: "Construcción",
  renovation: "Rehabilitación",
  acquisition_and_renovation: "Adquisición y rehabilitación",
};

export const INTENDED_USE_LABELS: Record<RealEstateIntendedUse, string> = {
  rental: "Alquiler",
  sale: "Venta",
  own_use: "Uso propio",
};

export const ASSET_TYPE_LABELS: Record<RealEstateAssetType, string> = {
  residential: "Residencial",
  commercial: "Comercial",
  industrial: "Industrial",
  land: "Suelo",
  mixed: "Mixto",
};

export interface ApproximateLocation {
  latitude: number;
  longitude: number;
}

export interface RealEstateDraft {
  // "" fins que es tria una opció.
  purpose: RealEstatePurpose | "";
  intended_use: RealEstateIntendedUse | "";
  asset_type: RealEstateAssetType | "";
  // Text del camp, en format espanyol («180» o «1.250,5»).
  surface: string;
  housing_units: string;
  // Dates del camp `date` («2027-06-30»).
  works_end: string;
  rental_start: string;
  location: ApproximateLocation | null;
}

export type RealEstateField = keyof RealEstateDraft;
export type RealEstateErrors = Partial<Record<RealEstateField, string>>;

export const EMPTY_REAL_ESTATE: RealEstateDraft = {
  purpose: "",
  intended_use: "",
  asset_type: "",
  surface: "",
  housing_units: "",
  works_end: "",
  rental_start: "",
  location: null,
};

// Condicions de visibilitat dels camps condicionals.
export const needsHousingUnits = (draft: RealEstateDraft) =>
  draft.asset_type === "residential" || draft.asset_type === "mixed";
export const includesWorks = (draft: RealEstateDraft) => draft.purpose !== "" && draft.purpose !== "acquisition";
export const isRental = (draft: RealEstateDraft) => draft.intended_use === "rental";

// Numeric(10, 2) al backend: com a molt vuit xifres enteres i dues decimals.
const MAX_SURFACE_HUNDREDTHS = 9_999_999_999;
// Columna integer de PostgreSQL.
const MAX_HOUSING_UNITS = 2_147_483_647;

// Superfície en centèsimes de m², amb el mateix analitzador exacte que els imports.
const parseSurface = (text: string): { hundredths: number } | { error: string } => {
  const parsed = parseEuroAmount(text);
  if ("error" in parsed) {
    if (parsed.error === "empty") return { error: "Introduce la superficie." };
    if (parsed.error === "decimals") return { error: "La superficie no puede tener más de dos decimales." };
    return { error: "Introduce una superficie válida, por ejemplo 180 o 180,5." };
  }
  if (parsed.cents <= 0) return { error: "La superficie debe ser mayor que 0." };
  if (parsed.cents > MAX_SURFACE_HUNDREDTHS) return { error: "La superficie no puede superar los 99.999.999,99 m²." };
  return { hundredths: parsed.cents };
};

const parseHousingUnits = (text: string): { units: number } | { error: string } => {
  const value = text.trim();
  if (!value) return { error: "Introduce el número de viviendas previstas." };
  if (!/^\d+$/.test(value)) return { error: "Introduce un número entero de viviendas." };
  const units = Number(value);
  if (units <= 0) return { error: "El número de viviendas debe ser mayor que 0." };
  if (units > MAX_HOUSING_UNITS) return { error: "Introduce un número de viviendas válido." };
  return { units };
};

export const validateRealEstate = (draft: RealEstateDraft): RealEstateErrors => {
  const errors: RealEstateErrors = {};
  if (!draft.purpose) errors.purpose = "Selecciona la finalidad.";
  if (!draft.intended_use) errors.intended_use = "Selecciona el uso previsto.";
  if (!draft.asset_type) errors.asset_type = "Selecciona el tipo de activo.";
  const surface = parseSurface(draft.surface);
  if ("error" in surface) errors.surface = surface.error;
  if (needsHousingUnits(draft)) {
    const units = parseHousingUnits(draft.housing_units);
    if ("error" in units) errors.housing_units = units.error;
  }
  return errors;
};

// «18050» centèsimes → «180.50»
const hundredthsToDecimal = (hundredths: number) =>
  `${Math.trunc(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;

// Només s'envien els camps que corresponen a la finalitat, l'ús i el tipus triats.
export const toRealEstatePayload = (draft: RealEstateDraft): { real_estate: RealEstateCreate } => {
  const surface = parseSurface(draft.surface);
  const units = needsHousingUnits(draft) ? parseHousingUnits(draft.housing_units) : null;
  return {
    real_estate: {
      purpose: draft.purpose as RealEstatePurpose,
      intended_use: draft.intended_use as RealEstateIntendedUse,
      asset_type: draft.asset_type as RealEstateAssetType,
      surface_m2: "hundredths" in surface ? hundredthsToDecimal(surface.hundredths) : "",
      planned_housing_units: units && "units" in units ? units.units : null,
      estimated_works_end: includesWorks(draft) && draft.works_end ? draft.works_end : null,
      estimated_rental_start: isRental(draft) && draft.rental_start ? draft.rental_start : null,
      public_latitude: draft.location?.latitude ?? null,
      public_longitude: draft.location?.longitude ?? null,
    },
  };
};

const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: "always" });
const coordinate = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 5, maximumFractionDigits: 5 });

export const formatSurface = (text: string) => {
  const surface = parseSurface(text);
  return "hundredths" in surface ? `${decimal.format(surface.hundredths / 100)} m²` : "—";
};

export const formatCoordinates = (location: ApproximateLocation) =>
  `${coordinate.format(location.latitude)}, ${coordinate.format(location.longitude)}`;

// Files del resum de «Revisión».
export const realEstateSummary = (draft: RealEstateDraft): [string, string][] => {
  const rows: [string, string][] = [
    [
      "Finalidad · Uso · Tipo",
      [
        draft.purpose && PURPOSE_LABELS[draft.purpose],
        draft.intended_use && INTENDED_USE_LABELS[draft.intended_use],
        draft.asset_type && ASSET_TYPE_LABELS[draft.asset_type],
      ].join(" · "),
    ],
    ["Superficie", formatSurface(draft.surface)],
  ];
  if (needsHousingUnits(draft)) rows.push(["Viviendas previstas", draft.housing_units.trim()]);
  if (includesWorks(draft)) {
    rows.push(["Finalización estimada de las obras", draft.works_end ? formatDate(draft.works_end) : "Sin indicar"]);
  }
  if (isRental(draft)) {
    rows.push(["Inicio estimado del alquiler", draft.rental_start ? formatDate(draft.rental_start) : "Sin indicar"]);
  }
  rows.push(["Ubicación aproximada", draft.location ? formatCoordinates(draft.location) : "Sin indicar"]);
  return rows;
};
