import type { PromoterOpportunity } from "../../store/useOpportunityStore";
import { formatShortDate } from "../opportunities/common/opportunityStatus";

// «Publicada el 2 nov 2026», o «Creada el …» mentre està pendent de revisió.
export const publicationLabel = (opportunity: PromoterOpportunity) =>
  opportunity.date_published
    ? `Publicada el ${formatShortDate(opportunity.date_published)}`
    : `Creada el ${formatShortDate(opportunity.created_at)}`;
