import { Description, FieldError, Label, TextField } from "@heroui/react";
import AmountInput from "../../../../components/AmountInput";
import type { TypeStepProps } from "../opportunityTypes";
import { PHASE_LABELS, SECTOR_LABELS } from "../../../opportunities/common/businessLabels";
import type { BusinessDraft } from "./businessDraft";
import OptionSelect from "../OptionSelect";
import { ERROR_CLASS, HELP_CLASS, LABEL_CLASS } from "../formStyles";

// Pas «Empresa»: sector, fase i valoració prèvia, necessària per calcular la participació oferta.
export default function BusinessStep({ value, onChange, errors }: TypeStepProps<BusinessDraft>) {
  const update = (patch: Partial<BusinessDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <OptionSelect
          name="sector"
          label="Sector"
          options={SECTOR_LABELS}
          value={value.sector}
          error={errors.sector}
          onChange={(sector) => update({ sector })}
        />
        <OptionSelect
          name="phase"
          label="Fase de la empresa"
          options={PHASE_LABELS}
          value={value.phase}
          error={errors.phase}
          onChange={(phase) => update({ phase })}
        />
      </div>

      <TextField name="valuation" validationBehavior="aria" isInvalid={!!errors.valuation} isRequired className="flex flex-col gap-1.5">
        <Label className={LABEL_CLASS}>Valoración previa a la inversión (€)</Label>
        <AmountInput placeholder="0,00" value={value.valuation} onValueChange={(valuation) => update({ valuation })} />
        <Description className={HELP_CLASS}>Valor de la empresa antes de esta ronda de financiación.</Description>
        <FieldError className={ERROR_CLASS}>{errors.valuation}</FieldError>
      </TextField>
    </div>
  );
}
