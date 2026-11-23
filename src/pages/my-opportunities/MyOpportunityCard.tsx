import { Link } from "react-router";
import type { PromoterOpportunity } from "../../store/useOpportunityStore";
import OpportunityProgress from "../opportunities/common/OpportunityProgress";
import { detailPath, formatShortDate, TYPE_LABELS } from "../opportunities/common/opportunityStatus";
import { publicationLabel } from "./myOpportunitiesFormat";

// Una oportunitat de l'entitat: títol (enllaç al detall si és pública), tipus, data, estat,
// progrés del finançament, nombre d'inversors i data límit.
export default function MyOpportunityCard({ opportunity }: { opportunity: PromoterOpportunity }) {
  return (
    <article
      aria-labelledby={`my-opportunity-${opportunity.id}`}
      className="grid grid-cols-1 gap-5 rounded-2xl border border-border bg-background p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
    >
      <div className="flex min-w-0 flex-col gap-2">
        <h3 id={`my-opportunity-${opportunity.id}`} className="text-lg font-semibold text-foreground wrap-break-word">
          {opportunity.is_public ? (
            <Link to={detailPath(opportunity)} className="underline underline-offset-4 hover:text-warning">
              {opportunity.title}
            </Link>
          ) : (
            // Les pendents de revisió encara no tenen detall públic.
            opportunity.title
          )}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className="rounded-md bg-muted/15 px-2 py-0.5 text-xs font-semibold text-foreground">
            {TYPE_LABELS[opportunity.type]}
          </span>
          <span>{publicationLabel(opportunity)}</span>
        </div>
      </div>

      <OpportunityProgress
        status={opportunity.funding_status}
        committedCents={opportunity.committed_cents}
        targetCents={opportunity.target_amount_cents}
      />

      <dl className="grid grid-cols-2 gap-4 text-sm lg:flex lg:flex-col lg:items-end lg:gap-2 lg:text-right">
        <div>
          <dt className="text-xs text-muted">Inversores</dt>
          <dd className="text-lg font-semibold tabular-nums text-foreground">{opportunity.investors_count}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Fecha límite</dt>
          <dd className="text-lg font-semibold text-foreground">{formatShortDate(opportunity.deadline)}</dd>
        </div>
      </dl>
    </article>
  );
}
