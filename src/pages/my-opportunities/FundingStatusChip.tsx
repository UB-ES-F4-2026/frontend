import type { FundingStatus } from "../../store/useOpportunityStore";
import { FUNDING_STATUS_DOTS, FUNDING_STATUS_LABELS } from "./myOpportunitiesFormat";

export default function FundingStatusChip({ status }: { status: FundingStatus }) {
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-muted/10 px-3 py-1 text-xs font-semibold text-foreground">
      <span aria-hidden="true" className={`size-2 rounded-full ${FUNDING_STATUS_DOTS[status]}`} />
      {FUNDING_STATUS_LABELS[status]}
    </span>
  );
}
