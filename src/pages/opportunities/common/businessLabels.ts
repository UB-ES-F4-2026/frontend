import type { BusinessPhase, BusinessSector } from "../../../store/useOpportunityStore";

// Noms dels sectors i fases de la US06.1.2, compartits pel detall i pel formulari de creació.

export const SECTOR_LABELS: Record<BusinessSector, string> = {
  technology: "Tecnología",
  industry: "Industria",
  food_and_beverage: "Alimentación y bebidas",
  commerce: "Comercio",
  health: "Salud",
  energy: "Energía",
  tourism_and_leisure: "Turismo y ocio",
  other_services: "Otros servicios",
};

export const PHASE_LABELS: Record<BusinessPhase, string> = {
  idea: "Idea",
  launch: "Lanzamiento",
  growth: "Crecimiento",
  consolidated: "Consolidada",
};
