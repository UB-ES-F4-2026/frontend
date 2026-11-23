import { formatEuroCents } from "../../service/money";
import type { PromoterOpportunitiesSummary } from "../../store/useOpportunityStore";

const Stat = ({ label, value, highlighted = false }: { label: string; value: string; highlighted?: boolean }) => (
  <div
    className={`flex flex-col gap-2 rounded-2xl border p-5 ${
      highlighted ? "border-transparent bg-brand text-brand-foreground" : "border-border bg-background"
    }`}
  >
    <dt className={`text-sm ${highlighted ? "text-brand-foreground/80" : "text-muted"}`}>{label}</dt>
    <dd className={`text-2xl font-semibold tabular-nums ${highlighted ? "text-brand-foreground" : "text-foreground"}`}>{value}</dd>
  </div>
);

// Resum de «Mis oportunidades». El capital i els recomptes de publicades venen del backend, que
// no hi compta les pendents de revisió.
export default function MyOpportunitiesSummary({ summary }: { summary: PromoterOpportunitiesSummary }) {
  return (
    <dl aria-label="Resumen" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Capital comprometido" value={formatEuroCents(summary.committed_cents)} highlighted />
      <Stat label="Oportunidades publicadas" value={String(summary.published_count)} />
      <Stat label="En financiación" value={String(summary.in_funding_count)} />
      <Stat label="Pendientes de revisión" value={String(summary.pending_review_count)} />
    </dl>
  );
}
