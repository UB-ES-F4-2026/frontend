import { Card } from "@heroui/react";
import Icon from "./OpportunityIcon";
import OpportunityInvestmentButton from "./OpportunityInvestmentButton";
import { formatCents, formatDateTime, formatRatio, utcOffsetLabel } from "./opportunityFormat";

interface FundingData {
  committed_cents: number;
  target_amount_cents: number;
  minimum_contribution_cents: number | null;
  deadline: string;
}

interface OpportunityFundingCardProps {
  opportunity: FundingData;
  now: number;
  // Només es crida si el botó «Quiero invertir» està actiu.
  onInvest: () => void;
}

const OpportunityFundingCard = ({ opportunity, now, onInvest }: OpportunityFundingCardProps) => {
  const ratio =
    opportunity.target_amount_cents > 0
      ? opportunity.committed_cents / opportunity.target_amount_cents
      : 0;
  const barWidth = Math.min(100, ratio * 100);
  const percentLabel = formatRatio(ratio);
  const fundingClosed = now >= new Date(opportunity.deadline).getTime();
  const targetReached = opportunity.committed_cents >= opportunity.target_amount_cents;
  // Un termini vençut té prioritat: la financiació ja no estava en curs.
  const fundingStatus = fundingClosed
    ? { label: "Plazo finalizado", dot: "bg-muted" }
    : targetReached
      ? { label: "Financiación completada", dot: "bg-success" }
      : { label: "En financiación", dot: "bg-warning" };
  const investmentButtonDisabled = targetReached || fundingClosed;

  const handleInvestmentButton = () => {
    if (!investmentButtonDisabled) onInvest();
  };

  return (
    <Card className="min-w-0 gap-0 border border-border p-7 shadow-sm min-[960px]:flex-1">
      <span className="inline-flex items-center self-start rounded-full border border-border bg-muted/10 px-4 py-2 text-xs font-semibold text-foreground">
        <span
          aria-hidden="true"
          className={`mr-2 size-[7px] rounded-full ${fundingStatus.dot}`}
        />
        {fundingStatus.label}
      </span>

      <p className="mt-4 text-xs text-muted">Capital comprometido</p>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {formatCents(opportunity.committed_cents)}
        </p>
        <span className="text-[22px] font-semibold whitespace-nowrap text-foreground">
          {percentLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>Objetivo de financiación</span>
        <strong className="text-foreground">{formatCents(opportunity.target_amount_cents)}</strong>
      </div>
      <div
        role="progressbar"
        aria-label="Capital comprometido respecto al objetivo"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(barWidth * 10) / 10}
        aria-valuetext={`${percentLabel} del objetivo`}
        className="my-2 h-2.5 w-full overflow-hidden rounded-full bg-muted/20"
      >
        <div className="h-full rounded-full bg-warning" style={{ width: `${barWidth}%` }} />
      </div>
      <p className="text-sm font-semibold text-foreground">{percentLabel} del objetivo</p>

      <dl className="mt-4 flex flex-col gap-6 border-t border-border pt-5">
        <div className="relative pl-[34px]">
          <Icon name="calendar" className="absolute top-0.5 left-0 text-foreground" />
          <dt className="text-xs text-muted">Fecha límite de financiación</dt>
          <dd className="mt-2 text-sm font-semibold text-foreground">
            <time dateTime={opportunity.deadline}>
              {formatDateTime(opportunity.deadline)}
              <span className="mt-1 block text-xs font-normal text-muted">
                Hora de Madrid ({utcOffsetLabel(opportunity.deadline)})
              </span>
            </time>
          </dd>
        </div>
        {opportunity.minimum_contribution_cents !== null && (
          <div className="relative pl-[34px]">
            <Icon name="coins" className="absolute top-0.5 left-0 text-foreground" />
            <dt className="text-xs text-muted">Aportación mínima</dt>
            <dd className="mt-2 text-sm font-semibold text-foreground">
              {formatCents(opportunity.minimum_contribution_cents)}
            </dd>
          </div>
        )}
      </dl>
      <dl className="mt-5 border-t border-border pt-4">
        <OpportunityInvestmentButton
          disabled={investmentButtonDisabled}
          investmentHandler={handleInvestmentButton}
        />
      </dl>
    </Card>
  );
};

export default OpportunityFundingCard;
