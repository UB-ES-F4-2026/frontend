import type { ReactNode } from "react";
import { Button, Checkbox, Label } from "@heroui/react";
import { formatEuroCents } from "../../../service/money";
import { formatDateTime } from "../../opportunities/common/opportunityFormat";
import { formatLocation, type FundingValues, type GeneralDraft } from "./opportunityDraft";

interface ReviewStepProps {
  general: GeneralDraft;
  typeLabel: string;
  typeRows: [string, string][];
  funding: FundingValues;
  availableCents: number | null;
  declared: boolean;
  onDeclaredChange: (declared: boolean) => void;
  // Índex del pas a editar: 0 general, 1 propi del tipus, 2 finançament.
  onEdit: (step: number) => void;
  isDisabled: boolean;
}

interface ReviewSectionProps {
  title: string;
  onEdit: () => void;
  isDisabled: boolean;
  children: ReactNode;
}

const ReviewSection = ({ title, onEdit, isDisabled, children }: ReviewSectionProps) => (
  <section aria-label={title} className="overflow-hidden rounded-xl border border-border">
    <div className="flex items-center justify-between gap-4 bg-muted/10 px-4 py-2.5">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Editar ${title}`}
        className="text-warning underline underline-offset-4"
        isDisabled={isDisabled}
        onPress={onEdit}
      >
        Editar
      </Button>
    </div>
    <dl className="divide-y divide-border text-sm">{children}</dl>
  </section>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
    <dt className="shrink-0 text-muted">{label}</dt>
    <dd className="min-w-0 font-medium text-foreground wrap-break-word sm:text-right">{children}</dd>
  </div>
);

export default function ReviewStep({
  general,
  typeLabel,
  typeRows,
  funding,
  availableCents,
  declared,
  onDeclaredChange,
  onEdit,
  isDisabled,
}: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <ReviewSection title="Información general" onEdit={() => onEdit(0)} isDisabled={isDisabled}>
        <Row label="Título">{general.title.trim()}</Row>
        <Row label="Descripción">
          <span className="line-clamp-3 whitespace-pre-line">{general.description.trim()}</span>
        </Row>
        <Row label="Ubicación">{formatLocation(general)}</Row>
        <Row label="Imágenes">{general.images.length}</Row>
      </ReviewSection>

      <ReviewSection title={typeLabel} onEdit={() => onEdit(1)} isDisabled={isDisabled}>
        {typeRows.length > 0 ? (
          typeRows.map(([label, value]) => <Row key={label} label={label}>{value}</Row>)
        ) : (
          <Row label="Datos">—</Row>
        )}
      </ReviewSection>

      <ReviewSection title="Financiación" onEdit={() => onEdit(2)} isDisabled={isDisabled}>
        <Row label="Objetivo de financiación">{formatEuroCents(funding.targetCents)}</Row>
        <Row label="Aportación mínima">{formatEuroCents(funding.minimumCents)}</Row>
        <Row label="Fecha límite">{formatDateTime(funding.deadline)}</Row>
        <Row label="Tu aportación inicial">
          {funding.initialCents !== null ? formatEuroCents(funding.initialCents) : "Sin aportación inicial"}
        </Row>
        {funding.initialCents !== null && availableCents !== null && (
          <Row label="Saldo disponible tras el envío">{formatEuroCents(availableCents - funding.initialCents)}</Row>
        )}
      </ReviewSection>

      <Checkbox name="declaration" isSelected={declared} isDisabled={isDisabled} onChange={onDeclaredChange}>
        <Checkbox.Content className="items-start gap-3">
          <Checkbox.Control className="mt-0.5 size-4 shrink-0 border border-foreground/40">
            <Checkbox.Indicator className={declared ? undefined : "invisible"}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-full">
                <path d="m5 12 4 4L19 6" />
              </svg>
            </Checkbox.Indicator>
          </Checkbox.Control>
          <Label className="text-sm text-foreground">
            Declaro que la información es veraz y entiendo que la oportunidad será revisada antes de publicarse.
          </Label>
        </Checkbox.Content>
      </Checkbox>
    </div>
  );
}
