import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null | undefined;

// Carrega Stripe.js una sola vegada, com recomana Stripe. Sense clau publicable retorna null:
// la pàgina d'ingrés avisa que el pagament amb targeta no està disponible.
export const getStripe = (): Promise<Stripe | null> | null => {
  if (stripePromise === undefined) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
    stripePromise = publishableKey ? loadStripe(publishableKey) : null;
  }
  return stripePromise;
};

// El formulari de Stripe és en un iframe i no veu les variables CSS: en llegim el valor.
const cssVariable = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;

// Aspecte del formulari de targeta alineat amb la resta de camps (blau de marca i cantonades).
export const stripeAppearance = (): Appearance => ({
  theme: "stripe",
  variables: {
    colorPrimary: cssVariable("--color-brand"),
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif',
    borderRadius: "12px",
  },
});
