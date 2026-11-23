import type { ComponentType } from "react";
import type { OpportunityCreateMetadata, OpportunityType } from "../../../store/useOpportunityStore";
import PendingTypeStep from "./PendingTypeStep";

// Punt d'extensió del formulari: el flux comú (Información general, Financiación i Revisión) és
// el mateix per a tots dos tipus, i cada tipus aporta el seu pas intermedi.

export type TypeStepErrors = Partial<Record<string, string>>;

export interface TypeStepProps<Data> {
  value: Data;
  onChange: (value: Data) => void;
  errors: TypeStepErrors;
}

export interface TypeStep<Data = Record<string, unknown>> {
  // Nom del pas a l'indicador i a la revisió: «Inmueble» o «Empresa».
  label: string;
  initial: Data;
  Form: ComponentType<TypeStepProps<Data>>;
  // Errors per camp; buit si es pot continuar.
  validate: (value: Data) => TypeStepErrors;
  // Files [etiqueta, valor] del resum a «Revisión».
  summary: (value: Data) => [string, string][];
  // Part pròpia del cos de POST /api/opportunities.
  toPayload: (value: Data) => Pick<OpportunityCreateMetadata, "real_estate" | "business">;
}

export interface OpportunityTypeConfig {
  title: string;
  step: TypeStep;
}

// Provisional: sense camps propis, el backend rebutja l'enviament (422) fins que #66 i #68
// substitueixin aquests passos pels reals.
const pendingStep = (label: string): TypeStep => ({
  label,
  initial: {},
  Form: PendingTypeStep,
  validate: () => ({}),
  summary: () => [],
  toPayload: () => ({}),
});

export const OPPORTUNITY_TYPES: Record<OpportunityType, OpportunityTypeConfig> = {
  real_estate: { title: "Nueva oportunidad inmobiliaria", step: pendingStep("Inmueble") },
  equity: { title: "Nueva oportunidad empresarial", step: pendingStep("Empresa") },
};
