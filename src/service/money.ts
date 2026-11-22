// `useGrouping: "always"`: l'es-ES per defecte no separa els milers de quatre xifres («1234,56 €»).
const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});

// El mateix format sense el símbol, per als camps on l'usuari escriu un import.
const amount = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

// Partim dels cèntims enters i passem a Intl un decimal exacte: cap divisió en coma flotant.
// Amb BigInt, una suma de saldos és exacta encara que superi 2^53 - 1.
const toDecimal = (cents: number | bigint) => {
  const value = BigInt(cents);
  const rest = String(value % 100n).padStart(2, "0");
  return `${value / 100n}.${rest}` as `${number}`;
};

// «1.234,56 €»
export const formatEuroCents = (cents: number | bigint) => eur.format(toDecimal(cents));

// «1.234,56»
export const formatAmountCents = (cents: number | bigint) => amount.format(toDecimal(cents));
