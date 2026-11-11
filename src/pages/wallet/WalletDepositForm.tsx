import { useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Button } from "@heroui/react";
import { fintechPost } from "../../service/api";

interface DepositIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

interface PaymentFormProps {
  amountCents: number;
  onCancel: () => void;
  onSuccess: (amountCents: number) => void | Promise<void>;
}

interface WalletDepositFormProps {
  stripePromise: Promise<Stripe | null> | null;
  onCancel: () => void;
  onSuccess: (amountCents: number) => void | Promise<void>;
}

export const getStripePromise = () => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  return publishableKey ? loadStripe(publishableKey) : null;
};

const formatCents = (cents: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    // Com a «Mi saldo»: l'es-ES per defecte no separa els milers de quatre xifres («1234,56 €»).
    useGrouping: "always",
  }).format(cents / 100);

function PaymentForm({ amountCents, onCancel, onSuccess }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || isConfirming) return;

    setIsConfirming(true);
    setErrorMessage("");
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/my-balance` },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message ?? "No se pudo confirmar el pago.");
      } else if (paymentIntent?.status === "succeeded") {
        await onSuccess(amountCents);
      } else {
        setErrorMessage("El pago todavía no se ha completado.");
      }
    } catch {
      setErrorMessage("No se pudo confirmar el pago. Inténtalo de nuevo.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={submitPayment}>
      <PaymentElement />
      {errorMessage && <p className="m-0 text-sm text-danger" role="alert">{errorMessage}</p>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onPress={onCancel} isDisabled={isConfirming}>
          Volver
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="bg-warning text-warning-foreground hover:bg-warning/90"
          isDisabled={!stripe || isConfirming}
        >
          {isConfirming ? "Procesando…" : `Pagar ${formatCents(amountCents)}`}
        </Button>
      </div>
    </form>
  );
}

export default function WalletDepositForm({
  stripePromise,
  onCancel,
  onSuccess,
}: WalletDepositFormProps) {
  const [amount, setAmount] = useState("");
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const createIntent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!stripePromise) {
      setErrorMessage("El ingreso con tarjeta no está disponible en este momento.");
      return;
    }

    const normalizedAmount = amount.trim().replace(",", ".");
    if (!/^\d+(\.\d{1,2})?$/.test(normalizedAmount)) {
      setErrorMessage("Introduce un importe válido con hasta dos decimales.");
      return;
    }
    const cents = Math.round(Number(normalizedAmount) * 100);
    if (!Number.isSafeInteger(cents) || cents < 50) {
      setErrorMessage("El ingreso mínimo es de 0,50 €.");
      return;
    }

    setIsCreatingIntent(true);
    try {
      const intent = await fintechPost<DepositIntentResponse>(
        "/me/wallet/deposit-intent",
        { amount_cents: cents },
      );
      setAmountCents(cents);
      setClientSecret(intent.client_secret);
    } catch {
      setErrorMessage("No se ha podido iniciar el ingreso. Inténtalo de nuevo.");
    } finally {
      setIsCreatingIntent(false);
    }
  };

  return (
    <div className="w-full">
      {clientSecret && stripePromise && amountCents !== null ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: { colorPrimary: "#172B4D", borderRadius: "6px" },
            },
          }}
        >
          <PaymentForm
            amountCents={amountCents}
            onCancel={() => setClientSecret("")}
            onSuccess={onSuccess}
          />
        </Elements>
      ) : (
        <form className="flex flex-col items-start gap-4" onSubmit={createIntent}>
          <div className="flex w-full flex-col gap-1.5">
            <label className="text-sm font-medium text-[#172B4D]" htmlFor="deposit-amount">
              Importe a ingresar (€)
            </label>
            <input
              className="min-h-11 w-full rounded-md border border-[#D0D5DD] px-3 text-base text-[#101828] outline-none focus-visible:border-[#172B4D] focus-visible:ring-2 focus-visible:ring-[#172B4D]/20 sm:max-w-64"
              id="deposit-amount"
              type="number"
              min="0.50"
              step="0.01"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
            <span className="text-xs text-[#667085]">Importe mínimo: 0,50 €</span>
          </div>
          {errorMessage && <p className="m-0 text-sm text-danger" role="alert">{errorMessage}</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onPress={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              isDisabled={isCreatingIntent}
            >
              {isCreatingIntent ? "Preparando pago…" : "Continuar al pago"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}