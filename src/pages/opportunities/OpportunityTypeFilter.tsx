import { Label, ListBox, Select } from "@heroui/react";
import type { OpportunityType } from "../../store/useOpportunityStore";

// «Todos» no correspon a cap tipus del backend: es tradueix a null (sense filtre).
const ALL = "all";

const OPTIONS: { id: OpportunityType | typeof ALL; label: string }[] = [
  { id: ALL, label: "Todos" },
  { id: "real_estate", label: "Inmobiliaria" },
  { id: "equity", label: "Empresarial" },
];

interface OpportunityTypeFilterProps {
  value: OpportunityType | null;
  onChange: (type: OpportunityType | null) => void;
}

const OpportunityTypeFilter = ({ value, onChange }: OpportunityTypeFilterProps) => (
  <Select
    name="type"
    className="w-full sm:w-56"
    value={value ?? ALL}
    onChange={(key) => onChange(key === ALL || key == null ? null : (String(key) as OpportunityType))}
  >
    <Label className="mb-2">Tipo de activo</Label>
    <Select.Trigger className="min-h-10 w-full">
      <Select.Value />
      <Select.Indicator />
    </Select.Trigger>
    <Select.Popover>
      <ListBox aria-label="Tipos de activo">
        {OPTIONS.map((option) => (
          <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
            {option.label}
          </ListBox.Item>
        ))}
      </ListBox>
    </Select.Popover>
  </Select>
);

export default OpportunityTypeFilter;
