import { formatEuroCents } from "../../service/money";
import type { PromoterOpportunitiesSummary } from "../../store/useOpportunityStore";
import SummaryStat from "../opportunities/common/SummaryStat";

// Resum de «Mis oportunidades». El capital i els recomptes de publicades venen del backend, que
// no hi compta les pendents de revisió.
export default function MyOpportunitiesSummary({ summary }: { summary: PromoterOpportunitiesSummary }) {
  return (
    <dl aria-label="Resumen" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryStat label="Capital comprometido" value={formatEuroCents(summary.committed_cents)} highlighted />
      <SummaryStat label="Oportunidades publicadas" value={String(summary.published_count)} />
      <SummaryStat label="En financiación" value={String(summary.in_funding_count)} />
      <SummaryStat label="Pendientes de revisión" value={String(summary.pending_review_count)} />
    </dl>
  );
}
