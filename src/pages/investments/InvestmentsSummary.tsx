import { formatEuroCents } from "../../service/money";
import type { InvestmentsSummary as Summary } from "../../store/useInvestmentStore";
import SummaryStat from "../opportunities/common/SummaryStat";

// Resum de «Mis inversiones». El total ve del backend i coincideix amb el saldo compromès.
export default function InvestmentsSummary({ summary }: { summary: Summary }) {
  return (
    <dl aria-label="Resumen" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <SummaryStat label="Total comprometido" value={formatEuroCents(summary.total_committed_cents)} highlighted />
      <SummaryStat label="Inversiones" value={String(summary.commitments_count)} />
      <SummaryStat label="En financiación" value={String(summary.in_funding_count)} />
    </dl>
  );
}
