import { Card } from "@heroui/react";
import { Opportunity, OpportunityType } from "../../store/useOpportunityStore";

const TYPE_LABEL: Record<OpportunityType, string> = {
  real_estate: "Inmobiliaria",
  equity: "Empresarial",
};

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const pct = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formatCents = (cents: number) => eur.format(cents / 100);

const daysLeft = (deadline: string) =>
  Math.max(
    0,
    Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000),
  );

interface OpportunityCardProps {
  opportunity: Opportunity;
}

const OpportunityCard = ({ opportunity }: OpportunityCardProps) => {
  const rawProgress =
    opportunity.target_amount_cents > 0
      ? (opportunity.committed_cents / opportunity.target_amount_cents) * 100
      : 0;
  const progress = Math.min(100, rawProgress);
  const remainingDays = daysLeft(opportunity.deadline);
  const isClosed = Boolean(opportunity.date_closed) || remainingDays === 0;

  const handleOpportunityClick = () => {
    alert(
      "Consulta del detalle de una oportunidad disponible en futuras versiones.",
    );
  };

  return (
    <Card
      className="cursor-pointer gap-0 overflow-hidden rounded-[14px] border border-line bg-white p-0 shadow-[0_4px_20px_#10182805] transition-transform duration-200 ease-out hover:scale-[1.01] motion-reduce:transition-none motion-reduce:hover:scale-100"
      onClick={handleOpportunityClick}
    >
      <div className="relative h-48 w-full bg-background">
        {opportunity.cover_image_url ? (
          <img
            src={opportunity.cover_image_url}
            alt={opportunity.title}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            Imagen no disponible
          </div>
        )}
      </div>

      <div className="left-3 top-3 flex flex-wrap gap-2 py-2 justify-between px-4 mt-2">
        <span className="inline-flex items-center rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-brand shadow-xs">
          {TYPE_LABEL[opportunity.type]}
        </span>
        <span className="inline-flex items-center rounded-full border border-line bg-background/95 px-3 py-1 text-xs font-medium text-muted">
          {isClosed ? "Plazo finalizado" : "En financiación"}
        </span>
      </div>

      <Card.Header className="flex flex-col items-start gap-1.5 px-5 pb-2">
        <Card.Title className="line-clamp-1 text-lg font-semibold tracking-tight text-brand">
          {opportunity.title}
        </Card.Title>
        <Card.Description className="flex w-full items-center gap-1.5 text-xs text-muted">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0 text-brand"
          >
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6" />
          </svg>
          <span className="truncate">{opportunity.location}</span>
        </Card.Description>
      </Card.Header>

      <Card.Content className="px-5 py-2">
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">
          {opportunity.description}
        </p>
      </Card.Content>

      <Card.Footer className="mt-2 flex flex-col items-stretch gap-3 px-5 pb-5">
        <div>
          <p className="text-xs text-muted">Capital comprometido</p>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-xl font-semibold tracking-tight text-brand">
              {formatCents(opportunity.committed_cents)}
            </span>
            <span className="text-sm font-semibold text-brand">
              {pct.format(rawProgress)} %
            </span>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/20">
            <div
                className="h-full rounded-full bg-warning"
                style={{ width: `${progress}%` }}
            />
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span>
            Objetivo:{" "}
            <strong className="font-semibold text-brand">
              {formatCents(opportunity.target_amount_cents)}
            </strong>
          </span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-brand"
            >
              <path d="M8 2v4m8-4v4M3 10h18M3 4h18v18H3Z" />
            </svg>
            {remainingDays} días restantes
          </span>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default OpportunityCard;
