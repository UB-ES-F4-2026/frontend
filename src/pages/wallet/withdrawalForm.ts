import { isValidIban, normalizeIban } from "../../service/iban";
import { formatEuroCents, parseEuroAmount } from "../../service/money";
import { MIN_WITHDRAWAL_CENTS, type WithdrawalRequest } from "../../store/useWalletStore";

const INVALID_AMOUNT = "Introduce un importe válido con hasta dos decimales.";

export const WITHDRAWAL_ERRORS = {
  amount: {
    empty: "Introduce el importe a retirar.",
    invalid: INVALID_AMOUNT,
    decimals: INVALID_AMOUNT,
    minimum: `La retirada mínima es de ${formatEuroCents(MIN_WITHDRAWAL_CENTS)}.`,
    insufficient: "El importe supera tu saldo disponible.",
  },
  iban: {
    empty: "Introduce el IBAN de destino.",
    invalid: "Introduce un IBAN válido.",
  },
  holder: {
    empty: "Introduce el titular de la cuenta.",
    invalid: "Usa solo letras, espacios, puntos, comas, apóstrofos y guiones.",
  },
} as const;

// Nom d'una persona o d'una empresa: lletres (amb accents i la ela geminada de «Marcel·lí»),
// espais i els signes habituals («Ana O'Brien-López», «Inversiones García, S.L.»).
// Ha de tenir almenys una lletra: «....» no és un nom.
const HOLDER_CHARACTERS = /^[\p{L}\p{M}\p{Zs}'’.,·-]+$/u;
const isValidHolder = (holder: string) => HOLDER_CHARACTERS.test(holder) && /\p{L}/u.test(holder);

// Text dels camps del primer pas, tal com l'escriu l'usuari.
export interface WithdrawalFields {
  amount: string;
  iban: string;
  holder: string;
}

export type WithdrawalFieldErrors = Partial<Record<keyof WithdrawalFields, string>>;

// El titular amb els espais com el desa el backend: «  Ana   García » → «Ana García».
export const normalizeHolder = (text: string) => text.trim().replace(/\s+/g, " ");

const checkAmount = (text: string, availableCents: number): { cents: number } | { error: string } => {
  const parsed = parseEuroAmount(text);
  if ("error" in parsed) return { error: WITHDRAWAL_ERRORS.amount[parsed.error] };
  if (parsed.cents < MIN_WITHDRAWAL_CENTS) return { error: WITHDRAWAL_ERRORS.amount.minimum };
  if (parsed.cents > availableCents) return { error: WITHDRAWAL_ERRORS.amount.insufficient };
  return parsed;
};

// Valida el primer pas abans de passar a la confirmació i retorna el cos de la petició.
// Comprova tots els camps alhora perquè cada error surti sota el seu. El backend ho torna a validar.
export const checkWithdrawal = (
  fields: WithdrawalFields,
  availableCents: number,
): { request: WithdrawalRequest } | { errors: WithdrawalFieldErrors } => {
  const errors: WithdrawalFieldErrors = {};

  const amount = checkAmount(fields.amount, availableCents);
  if ("error" in amount) errors.amount = amount.error;

  const iban = normalizeIban(fields.iban);
  if (!iban) errors.iban = WITHDRAWAL_ERRORS.iban.empty;
  else if (!isValidIban(iban)) errors.iban = WITHDRAWAL_ERRORS.iban.invalid;

  const holder = normalizeHolder(fields.holder);
  if (!holder) errors.holder = WITHDRAWAL_ERRORS.holder.empty;
  else if (!isValidHolder(holder)) errors.holder = WITHDRAWAL_ERRORS.holder.invalid;

  if ("error" in amount || errors.iban || errors.holder) return { errors };
  return { request: { amount_cents: amount.cents, iban, account_holder: holder } };
};
