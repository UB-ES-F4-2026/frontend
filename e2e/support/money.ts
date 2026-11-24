// Mateix format que `src/service/money.ts`: «1.234,56 €», amb els milers sempre separats.
const euros = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  useGrouping: "always",
});

// Format del detall d'oportunitat (`opportunityFormat.ts`): l'es-ES per defecte no separa
// els milers de quatre xifres, i per això no es pot reutilitzar `eur`.
const detailEuros = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

const ratio = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Intl separa el símbol amb un espai dur: els textos esperats es construeixen, no s'escriuen a mà.
export const eur = (cents: number) => euros.format(cents / 100);

export const detailEur = (cents: number) => detailEuros.format(cents / 100);

// «62,6 %»: percentatge finançat tal com el mostren el detall i les llistes.
export const fundedPercent = (committedCents: number, targetCents: number) =>
  ratio.format(committedCents / targetCents);

const equity = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

// «0,033 %»: participació estimada = import ÷ (valoració prèvia + objectiu), com `contributionAmount.ts`.
export const equityPercent = (amountCents: number, valuationCents: number, targetCents: number) =>
  equity.format(amountCents / (valuationCents + targetCents));
