import { FieldError, Input, Label, TextField } from "@heroui/react";
import type { TypeStepProps } from "../opportunityTypes";
import {
  ASSET_TYPE_LABELS,
  includesWorks,
  INTENDED_USE_LABELS,
  isRental,
  needsHousingUnits,
  PURPOSE_LABELS,
  type RealEstateDraft,
} from "./realEstateDraft";
import LocationPicker from "./LocationPicker";
import OptionSelect from "../OptionSelect";
import { ERROR_CLASS, FIELD_CLASS, LABEL_CLASS } from "../formStyles";

const OPTIONAL = <span className="font-normal text-muted">(opcional)</span>;

// Pas «Inmueble»: els camps condicionals només apareixen quan la finalitat, l'ús o el tipus
// triats els fan aplicables.
export default function RealEstateStep({ value, onChange, errors }: TypeStepProps<RealEstateDraft>) {
  const update = (patch: Partial<RealEstateDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <OptionSelect
          name="purpose"
          label="Finalidad"
          options={PURPOSE_LABELS}
          value={value.purpose}
          error={errors.purpose}
          onChange={(purpose) => update({ purpose })}
        />
        <OptionSelect
          name="intended_use"
          label="Uso previsto"
          options={INTENDED_USE_LABELS}
          value={value.intended_use}
          error={errors.intended_use}
          onChange={(intended_use) => update({ intended_use })}
        />
        <OptionSelect
          name="asset_type"
          label="Tipo de activo"
          options={ASSET_TYPE_LABELS}
          value={value.asset_type}
          error={errors.asset_type}
          onChange={(asset_type) => update({ asset_type })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField name="surface" validationBehavior="aria" isInvalid={!!errors.surface} isRequired className="flex min-w-0 flex-col gap-1.5">
          <Label className={LABEL_CLASS}>Superficie (m²)</Label>
          <Input
            inputMode="decimal"
            autoComplete="off"
            placeholder="180"
            className={`h-10 ${FIELD_CLASS}`}
            value={value.surface}
            onChange={(event) => update({ surface: event.target.value })}
          />
          <FieldError className={ERROR_CLASS}>{errors.surface}</FieldError>
        </TextField>

        {needsHousingUnits(value) && (
          <TextField name="housing_units" validationBehavior="aria" isInvalid={!!errors.housing_units} isRequired className="flex min-w-0 flex-col gap-1.5">
            <Label className={LABEL_CLASS}>Viviendas previstas</Label>
            <Input
              inputMode="numeric"
              autoComplete="off"
              className={`h-10 ${FIELD_CLASS}`}
              value={value.housing_units}
              onChange={(event) => update({ housing_units: event.target.value })}
            />
            <FieldError className={ERROR_CLASS}>{errors.housing_units}</FieldError>
          </TextField>
        )}
      </div>

      {(includesWorks(value) || isRental(value)) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {includesWorks(value) && (
            <TextField name="works_end" className="flex min-w-0 flex-col gap-1.5">
              <Label className={LABEL_CLASS}>Finalización estimada de las obras {OPTIONAL}</Label>
              <Input
                type="date"
                className={`h-10 ${FIELD_CLASS}`}
                value={value.works_end}
                onChange={(event) => update({ works_end: event.target.value })}
              />
            </TextField>
          )}
          {isRental(value) && (
            <TextField name="rental_start" className="flex min-w-0 flex-col gap-1.5">
              <Label className={LABEL_CLASS}>Inicio estimado del alquiler {OPTIONAL}</Label>
              <Input
                type="date"
                className={`h-10 ${FIELD_CLASS}`}
                value={value.rental_start}
                onChange={(event) => update({ rental_start: event.target.value })}
              />
            </TextField>
          )}
        </div>
      )}

      <LocationPicker value={value.location} onChange={(location) => update({ location })} />
    </div>
  );
}
