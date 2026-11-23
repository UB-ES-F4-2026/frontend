import { FieldError, Label, ListBox, Select } from "@heroui/react";
import { ERROR_CLASS, FIELD_CLASS, LABEL_CLASS } from "./formStyles";

interface OptionSelectProps<Value extends string> {
  name: string;
  label: string;
  // Valor del backend → nom que es mostra, en l'ordre de la llista.
  options: Record<Value, string>;
  // "" mentre no s'ha triat cap opció.
  value: Value | "";
  onChange: (value: Value | "") => void;
  error?: string;
}

// Desplegable obligatori d'una sola opció dels passos propis de cada tipus.
export default function OptionSelect<Value extends string>({ name, label, options, value, onChange, error }: OptionSelectProps<Value>) {
  return (
    <Select
      name={name}
      placeholder="Selecciona"
      validationBehavior="aria"
      isInvalid={!!error}
      isRequired
      className="flex min-w-0 flex-col gap-1.5"
      value={value || null}
      onChange={(key) => onChange(key === null ? "" : (String(key) as Value))}
    >
      <Label className={LABEL_CLASS}>{label}</Label>
      <Select.Trigger className={`h-10 min-h-10 ${FIELD_CLASS}`}>
        <Select.Value className="min-w-0 truncate" />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox aria-label={label}>
          {(Object.entries(options) as [Value, string][]).map(([id, text]) => (
            <ListBox.Item key={id} id={id} textValue={text}>
              {text}
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
      <FieldError className={ERROR_CLASS}>{error}</FieldError>
    </Select>
  );
}
