import { formatEuroCents, parseEuroAmount } from "../../service/money";
import { MAX_DEPOSIT_CENTS, MIN_DEPOSIT_CENTS } from "../../store/useWalletStore";

const INVALID_DEPOSIT_AMOUNT = "Introduce un importe válido con hasta dos decimales.";

export const DEPOSIT_AMOUNT_ERRORS = {
  empty: "Introduce el importe a ingresar.",
  invalid: INVALID_DEPOSIT_AMOUNT,
  decimals: INVALID_DEPOSIT_AMOUNT,
  minimum: `El ingreso mínimo es de ${formatEuroCents(MIN_DEPOSIT_CENTS)}.`,
  maximum: `El ingreso máximo es de ${formatEuroCents(MAX_DEPOSIT_CENTS)}.`,
} as const;

// Valida l'import abans de preparar el pagament. El backend ho torna a comprovar.
export const checkDepositAmount = (text: string): { cents: number } | { error: string } => {
  const parsed = parseEuroAmount(text);
  if ("error" in parsed) return { error: DEPOSIT_AMOUNT_ERRORS[parsed.error] };
  if (parsed.cents < MIN_DEPOSIT_CENTS) return { error: DEPOSIT_AMOUNT_ERRORS.minimum };
  if (parsed.cents > MAX_DEPOSIT_CENTS) return { error: DEPOSIT_AMOUNT_ERRORS.maximum };
  return parsed;
};
