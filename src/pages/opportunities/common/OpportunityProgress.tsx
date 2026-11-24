import { formatEuroCents } from "../../../service/money";
import type { FundingStatus } from "../../../store/useOpportunityStore";
import FundingStatusChip from "./FundingStatusChip";
import { formatRatio } from "./opportunityFormat";
import { fundingRatio } from "./opportunityStatus";

interface OpportunityProgressProps {
  status: FundingStatus;
  committedCents: number;
  targetCents: number;
}

// Estat actual i progrés del finançament: «45.100,00 € de 72.000,00 € · 62,6 %».
export default function OpportunityProgress({ status, committedCents, targetCents }: OpportunityProgressProps) {
  const ratio = fundingRatio(committedCents, targetCents);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <FundingStatusChip status={status} />
      <div
        role="progressbar"
        aria-label="Financiación"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(Math.round(ratio * 100), 100)}
        className="h-2 w-full overflow-hidden rounded-full bg-muted/20"
      >
        <div className="h-full rounded-full bg-warning" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
      <p className="text-xs text-muted">
        <span className="font-semibold text-foreground">{formatEuroCents(committedCents)}</span>
        {` de ${formatEuroCents(targetCents)} · ${formatRatio(ratio)}`}
      </p>
    </div>
  );
}
