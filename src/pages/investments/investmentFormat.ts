import type { Investment } from "../../store/useInvestmentStore";
import { formatShortDate } from "../opportunities/common/opportunityStatus";

// Participacions petites («0,033 %»): fins a tres decimals.
const equity = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 3,
});

// El backend envia el percentatge ja multiplicat per 100. null si no n'hi ha (immobiliàries) o
// si el valor no és numèric, perquè no es mostri com a 0 %.
export const formatEstimatedEquity = (value: Investment["estimated_equity"]) => {
  if (value === null) return null;
  const percent = Number(value);
  return Number.isFinite(percent) ? equity.format(percent / 100) : null;
};

export const commitmentLabel = (investment: Investment) => `Comprometida el ${formatShortDate(investment.created_at)}`;
