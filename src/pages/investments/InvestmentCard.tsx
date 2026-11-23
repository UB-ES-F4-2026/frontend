import { Link } from "react-router";
import { formatEuroCents } from "../../service/money";
import type { Investment } from "../../store/useInvestmentStore";
import OpportunityProgress from "../opportunities/common/OpportunityProgress";
import { detailPath, TYPE_LABELS } from "../opportunities/common/opportunityStatus";
import { commitmentLabel, formatEstimatedEquity } from "./investmentFormat";

// Una inversió: l'oportunitat (enllaç al detall si és pública), el tipus, la data, l'estat i el
// progrés actuals, l'import invertit i, en les empresarials, la participació estimada.
export default function InvestmentCard({ investment }: { investment: Investment }) {
  const { opportunity } = investment;
  const titleId = `investment-${investment.id}`;
  const estimatedEquity = formatEstimatedEquity(investment.estimated_equity);

  return (
    <article
      aria-labelledby={titleId}
      className="grid grid-cols-1 gap-5 rounded-2xl border border-border bg-background p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <h3 id={titleId} className="text-lg font-semibold text-foreground wrap-break-word">
          {opportunity.is_public ? (
            // També obre el detall de les que ja no surten al catàleg (finançades, vençudes, tancades).
            <Link to={detailPath(opportunity)} className="underline underline-offset-4 hover:text-warning">
              {opportunity.title}
            </Link>
          ) : (
            // Aportació inicial a una oportunitat pròpia pendent de revisió: encara no té detall públic.
            opportunity.title
          )}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className="rounded-md bg-muted/15 px-2 py-0.5 text-xs font-semibold text-foreground">
            {TYPE_LABELS[opportunity.type]}
          </span>
          <span>{commitmentLabel(investment)}</span>
        </div>
      </div>

      <OpportunityProgress
        status={opportunity.funding_status}
        committedCents={opportunity.committed_cents}
        targetCents={opportunity.target_amount_cents}
      />

      <dl className="flex flex-col gap-1 text-sm lg:items-end lg:text-right">
        <div>
          <dt className="text-xs text-muted">Tu inversión</dt>
          <dd className="text-2xl font-semibold tabular-nums text-foreground">{formatEuroCents(investment.amount_cents)}</dd>
        </div>
        {estimatedEquity && (
          <div className="flex items-baseline gap-1 text-xs lg:justify-end">
            <dt className="text-muted">Participación estimada</dt>
            <dd className="font-semibold tabular-nums text-foreground">{estimatedEquity}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
