import { useLayoutEffect, useRef, type ChangeEvent, type ComponentProps } from "react";
import { Input } from "@heroui/react";
import { formatAmountCents, formatAmountInput, parseEuroAmount } from "../service/money";

type AmountInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onBlur" | "type" | "inputMode" | "ref"
> & {
  value: string;
  // «input»: l'usuari ha editat el camp. «blur»: només s'ha completat el format en sortir-ne,
  // i per això no ha d'esborrar l'error que s'estigui mostrant.
  onValueChange: (text: string, reason: "input" | "blur") => void;
};

const FIELD_CLASS =
  "h-12 w-full min-w-0 rounded-xl border border-foreground/15 bg-background px-4 text-base tabular-nums text-foreground shadow-none placeholder:text-foreground/40 focus:border-warning focus:ring-2 focus:ring-warning/30";

// Camp d'import en euros: posa els punts de milers mentre s'escriu («1.234,5») i completa els
// decimals en sortir («1.234,50»). Va dins d'un `TextField`, que n'associa l'etiqueta i l'error.
export default function AmountInput({ value, onValueChange, className, ...props }: AmountInputProps) {
  // En afegir o treure punts de milers, React mouria el cursor al final: el retornem al seu lloc.
  const input = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const element = input.current;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    if (element && caret !== null && document.activeElement === element) {
      element.setSelectionRange(caret, caret);
    }
  }, [value]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const element = event.target;
    const inputType = (event.nativeEvent as InputEvent).inputType || "insertText";
    const { text, caret } = formatAmountInput(
      element.value,
      element.selectionStart ?? element.value.length,
      inputType,
    );
    pendingCaret.current = caret;
    onValueChange(text, "input");
  };

  // Si el text no és vàlid, es deixa tal com està perquè l'error de validació s'entengui.
  const handleBlur = () => {
    const parsed = parseEuroAmount(value);
    if ("cents" in parsed) {
      const formatted = formatAmountCents(parsed.cents);
      if (formatted !== value) onValueChange(formatted, "blur");
    }
  };

  return (
    <Input
      {...props}
      ref={input}
      inputMode="decimal"
      autoComplete="off"
      className={className ? `${FIELD_CLASS} ${className}` : FIELD_CLASS}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
