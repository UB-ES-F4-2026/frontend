import { FieldError, Input, Label, ListBox, Select, TextField } from "@heroui/react";
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
import { ERROR_CLASS, FIELD_CLASS, LABEL_CLASS } from "../formStyles";

type SelectField = "purpose" | "intended_use" | "asset_type";

const SELECTS: { name: SelectField; label: string; options: Record<string, string> }[] = [
  { name: "purpose", label: "Finalidad", options: PURPOSE_LABELS },
  { name: "intended_use", label: "Uso previsto", options: INTENDED_USE_LABELS },
  { name: "asset_type", label: "Tipo de activo", options: ASSET_TYPE_LABELS },
];

const OPTIONAL = <span className="font-normal text-muted">(opcional)</span>;

// Pas «Inmueble»: els camps condicionals només apareixen quan la finalitat, l'ús o el tipus
// triats els fan aplicables.
export default function RealEstateStep({ value, onChange, errors }: TypeStepProps<RealEstateDraft>) {
  const update = (patch: Partial<RealEstateDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SELECTS.map((field) => (
          <Select
            key={field.name}
            name={field.name}
            placeholder="Selecciona"
            validationBehavior="aria"
            isInvalid={!!errors[field.name]}
            isRequired
            className="flex min-w-0 flex-col gap-1.5"
            value={value[field.name] || null}
            onChange={(key) => update({ [field.name]: key === null ? "" : String(key) })}
          >
            <Label className={LABEL_CLASS}>{field.label}</Label>
            <Select.Trigger className={`h-10 min-h-10 ${FIELD_CLASS}`}>
              <Select.Value className="min-w-0 truncate" />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox aria-label={field.label}>
                {Object.entries(field.options).map(([id, label]) => (
                  <ListBox.Item key={id} id={id} textValue={label}>
                    {label}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
            <FieldError className={ERROR_CLASS}>{errors[field.name]}</FieldError>
          </Select>
        ))}
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
