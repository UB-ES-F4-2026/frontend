import type { ComponentType } from "react";
import type { OpportunityCreateMetadata, OpportunityType } from "../../../store/useOpportunityStore";
import RealEstateStep from "./real-estate/RealEstateStep";
import {
  EMPTY_REAL_ESTATE,
  realEstateSummary,
  toRealEstatePayload,
  validateRealEstate,
  type RealEstateDraft,
} from "./real-estate/realEstateDraft";
import BusinessStep from "./business/BusinessStep";
import {
  businessFundingSummary,
  businessSummary,
  EMPTY_BUSINESS,
  toBusinessPayload,
  validateBusiness,
  type BusinessDraft,
} from "./business/businessDraft";

// Punt d'extensió del formulari: el flux comú (Información general, Financiación i Revisión) és
// el mateix per a tots dos tipus, i cada tipus aporta el seu pas intermedi.

export type TypeStepErrors = Partial<Record<string, string>>;

export interface TypeStepProps<Data> {
  value: Data;
  onChange: (value: Data) => void;
  errors: TypeStepErrors;
}

export interface TypeStep<Data> {
  // Nom del pas a l'indicador i a la revisió: «Inmueble» o «Empresa».
  label: string;
  initial: Data;
  Form: ComponentType<TypeStepProps<Data>>;
  // Errors per camp; buit si es pot continuar.
  validate: (value: Data) => TypeStepErrors;
  // Files [etiqueta, valor] del resum a «Revisión».
  summary: (value: Data) => [string, string][];
  // Files que depenen de l'objectiu de finançament (p. ex. la participació oferta). Es mostren al
  // pas «Financiación», actualitzades mentre s'escriu, i a la seva secció del resum.
  fundingSummary?: (value: Data, targetCents: number | null) => [string, string][];
  // Part pròpia del cos de POST /api/opportunities.
  toPayload: (value: Data) => Pick<OpportunityCreateMetadata, "real_estate" | "business">;
}

export interface OpportunityTypeConfig<Data> {
  type: OpportunityType;
  title: string;
  step: TypeStep<Data>;
}

export const REAL_ESTATE_TYPE: OpportunityTypeConfig<RealEstateDraft> = {
  type: "real_estate",
  title: "Nueva oportunidad inmobiliaria",
  step: {
    label: "Inmueble",
    initial: EMPTY_REAL_ESTATE,
    Form: RealEstateStep,
    validate: validateRealEstate,
    summary: realEstateSummary,
    toPayload: toRealEstatePayload,
  },
};

export const EQUITY_TYPE: OpportunityTypeConfig<BusinessDraft> = {
  type: "equity",
  title: "Nueva oportunidad empresarial",
  step: {
    label: "Empresa",
    initial: EMPTY_BUSINESS,
    Form: BusinessStep,
    validate: validateBusiness,
    summary: businessSummary,
    fundingSummary: businessFundingSummary,
    toPayload: toBusinessPayload,
  },
};
