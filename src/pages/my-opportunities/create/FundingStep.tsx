import { Button, Description, FieldError, Input, Label, Spinner, TextField } from "@heroui/react";
import AmountInput from "../../../components/AmountInput";
import { formatEuroCents } from "../../../service/money";
import type { FundingDraft, FundingErrors, FundingField } from "./opportunityDraft";
import { ERROR_CLASS, FIELD_CLASS, HELP_CLASS, LABEL_CLASS } from "./formStyles";

interface FundingStepProps {
  value: FundingDraft;
  errors: FundingErrors;
  // `keepError`: només s'ha completat el format de l'import en sortir del camp.
  onChange: (field: FundingField, text: string, keepError?: boolean) => void;
  // null mentre es consulta o si no s'ha pogut consultar.
  availableCents: number | null;
  balanceFailed: boolean;
  onRetryBalance: () => void;
  // Files pròpies del tipus que depenen de l'objectiu («Participación ofrecida»).
  extraRows?: [string, string][];
}

const AMOUNT_FIELDS = [
  { name: "target", label: "Objetivo de financiación" },
  { name: "minimum", label: "Aportación mínima" },
] as const;

export default function FundingStep({
  value,
  errors,
  onChange,
  availableCents,
  balanceFailed,
  onRetryBalance,
  extraRows = [],
}: FundingStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {AMOUNT_FIELDS.map((field) => (
          <TextField
            key={field.name}
            name={field.name}
            validationBehavior="aria"
            isInvalid={!!errors[field.name]}
            isRequired
            className="flex min-w-0 flex-col gap-1.5"
          >
            <Label className={LABEL_CLASS}>{field.label} (€)</Label>
            <AmountInput
              placeholder="0,00"
              value={value[field.name]}
              onValueChange={(text, reason) => onChange(field.name, text, reason === "blur")}
            />
            <FieldError className={ERROR_CLASS}>{errors[field.name]}</FieldError>
          </TextField>
        ))}
      </div>

      {extraRows.length > 0 && (
        // S'anuncia quan canvia, perquè l'actualització mentre s'escriu l'objectiu també s'escolti.
        <dl aria-live="polite" className="flex flex-col gap-2">
          {extraRows.map(([label, text]) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-muted/10 px-4 py-3 text-sm">
              <dt className="text-muted">{label}</dt>
              <dd className="font-semibold tabular-nums text-foreground">{text}</dd>
            </div>
          ))}
        </dl>
      )}

      <TextField name="deadline" validationBehavior="aria" isInvalid={!!errors.deadline} isRequired className="flex flex-col gap-1.5">
        <Label className={LABEL_CLASS}>Fecha límite de financiación</Label>
        <Input
          type="datetime-local"
          className={`h-12 ${FIELD_CLASS}`}
          value={value.deadline}
          onChange={(event) => onChange("deadline", event.target.value)}
        />
        <Description className={HELP_CLASS}>Hora de Madrid.</Description>
        <FieldError className={ERROR_CLASS}>{errors.deadline}</FieldError>
      </TextField>

      <hr className="border-border" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/10 px-4 py-3 text-sm">
          <span className="text-muted">Saldo disponible</span>
          <span className="font-semibold tabular-nums text-foreground">
            {availableCents !== null ? (
              formatEuroCents(availableCents)
            ) : balanceFailed ? (
              "No disponible"
            ) : (
              <span role="status" className="inline-flex items-center gap-2 font-normal">
                <Spinner size="sm" color="current" aria-hidden="true" />
                Cargando…
              </span>
            )}
          </span>
        </div>
        {balanceFailed && (
          <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-danger">
            No se ha podido consultar tu saldo.
            <Button size="sm" variant="secondary" onPress={onRetryBalance}>Reintentar</Button>
          </div>
        )}
      </div>

      <TextField name="initial" validationBehavior="aria" isInvalid={!!errors.initial} className="flex flex-col gap-1.5">
        <Label className={LABEL_CLASS}>
          Tu aportación inicial (€) <span className="font-normal text-muted">(opcional)</span>
        </Label>
        <AmountInput
          placeholder="0,00"
          value={value.initial}
          onValueChange={(text, reason) => onChange("initial", text, reason === "blur")}
        />
        <Description className={HELP_CLASS}>
          Se reservará de tu saldo al enviar la oportunidad. Debe estar entre la aportación mínima y el objetivo.
        </Description>
        <FieldError className={ERROR_CLASS}>{errors.initial}</FieldError>
      </TextField>
    </div>
  );
}
