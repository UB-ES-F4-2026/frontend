import { Card, MenuItem } from "@heroui/react";
import { Opportunity, OpportunityType } from "../../store/useOpportunityStore";

const TYPE_LABEL: Record<OpportunityType, string> = {
  real_estate: "Inmobiliario",
  equity: "Startup",
};

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const formatCents = (cents: number) => eur.format(cents / 100);

const daysLeft = (deadline: string) =>
  Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000));

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export const OpportunityCard = ({opportunity} : OpportunityCardProps) => {
    const progress = opportunity.target_amount_cents > 0 
        ? Math.min(100, (opportunity.committed_cents / opportunity.target_amount_cents) * 100) : 0;
    
    const handleOpportunityClick = () => {
        alert("Consulta del detalle de una oportunidad disponible en futuras versiones.");
    }
    
    return (
        <Card 
            className="cursor-pointer transition-transform duration-200 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
            onClick={handleOpportunityClick}
        >
            <Card.Header>
                <Card.Title>
                    {opportunity.title}
                </Card.Title>
                <Card.Description className="flex w-full items-center gap-1">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="size-4 shrink-0"
                    >
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{opportunity.location}</span>
                </Card.Description>
            </Card.Header>
            <Card.Content>
                {opportunity.cover_image_url ? (
                    <img
                        src={opportunity.cover_image_url}
                        alt=""
                        loading="lazy"
                        className="h-44 w-full object-cover"
                    />
                    ) : (
                    <div className="h-44 w-full bg-muted/20" />
                )}
            </Card.Content>
            <Card.Footer className="flex w-full items-center justify-between gap-4">
                <div className="flex flex-1 flex-col gap-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/20">
                        <div
                            className="h-full rounded-full bg-warning"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="flex text-sm gap-1">
                        <span className="font-semibold text-foreground">
                            {formatCents(opportunity.committed_cents)}
                        </span>
                        <span className="text-muted">
                            de {formatCents(opportunity.target_amount_cents)}
                        </span>
                    </div>
                </div>
                <p className="shrink-0 whitespace-nowrap text-xs text-muted">
                    {daysLeft(opportunity.deadline)} días restantes
                </p>
            </Card.Footer>
        </Card>
    );
}