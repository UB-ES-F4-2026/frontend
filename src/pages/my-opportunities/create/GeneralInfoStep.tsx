import { Description, FieldError, Fieldset, Input, Label, TextArea, TextField } from "@heroui/react";
import type { GeneralDraft, GeneralErrors } from "./opportunityDraft";
import ImagePicker from "./ImagePicker";
import { ERROR_CLASS, FIELD_CLASS, HELP_CLASS, LABEL_CLASS } from "./formStyles";

interface GeneralInfoStepProps {
  value: GeneralDraft;
  errors: GeneralErrors;
  onChange: (patch: Partial<GeneralDraft>) => void;
}

const LOCATION_FIELDS = [
  { name: "municipality", label: "Municipio", autoComplete: "address-level2" },
  { name: "province", label: "Provincia", autoComplete: "address-level1" },
  { name: "country", label: "País", autoComplete: "country-name" },
] as const;

export default function GeneralInfoStep({ value, errors, onChange }: GeneralInfoStepProps) {
  return (
    <div className="flex flex-col gap-5">
      <TextField name="title" validationBehavior="aria" isInvalid={!!errors.title} isRequired className="flex flex-col gap-1.5">
        <Label className={LABEL_CLASS}>Título</Label>
        <Input
          className={`h-10 ${FIELD_CLASS}`}
          value={value.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
        <FieldError className={ERROR_CLASS}>{errors.title}</FieldError>
      </TextField>

      <TextField name="description" validationBehavior="aria" isInvalid={!!errors.description} isRequired className="flex flex-col gap-1.5">
        <Label className={LABEL_CLASS}>Descripción</Label>
        <TextArea
          rows={5}
          className={`py-2 ${FIELD_CLASS}`}
          value={value.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
        <Description className={HELP_CLASS}>El primer párrafo se mostrará como introducción en el detalle.</Description>
        <FieldError className={ERROR_CLASS}>{errors.description}</FieldError>
      </TextField>

      {/* Tres camps, com OpportunityLocationCreate del backend. */}
      <Fieldset className="flex min-w-0 flex-col gap-1.5">
        <Fieldset.Legend className={`mb-1 ${LABEL_CLASS}`}>Ubicación</Fieldset.Legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {LOCATION_FIELDS.map((field) => (
            <TextField
              key={field.name}
              name={field.name}
              validationBehavior="aria"
              isInvalid={!!errors[field.name]}
              isRequired
              className="flex min-w-0 flex-col gap-1.5"
            >
              <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
              <Input
                className={`h-10 ${FIELD_CLASS}`}
                autoComplete={field.autoComplete}
                value={value[field.name]}
                onChange={(event) => onChange({ [field.name]: event.target.value })}
              />
              <FieldError className={ERROR_CLASS}>{errors[field.name]}</FieldError>
            </TextField>
          ))}
        </div>
        <p className={HELP_CLASS}>No indiques la dirección exacta.</p>
      </Fieldset>

      <ImagePicker images={value.images} error={errors.images} onChange={(images) => onChange({ images })} />
    </div>
  );
}
