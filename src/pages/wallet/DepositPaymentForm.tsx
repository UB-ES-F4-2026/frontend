import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Spinner } from "@heroui/react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { formatEuroCents } from "../../service/money";
import { useWalletStore } from "../../store/useWalletStore";

interface DepositPaymentFormProps {
  amountCents: number;
  // Torna al pas de l'import, que conserva l'import escrit.
  onBack: () => void;
  // El pagament s'ha completat i el saldo ja s'ha tornat a llegir.
  onPaid: () => void;
}

const PRIMARY = "bg-warning text-warning-foreground hover:bg-warning/90";

interface PaymentError {
  title: string;
  description: string;
}

const PAYMENT_ERROR: PaymentError = {
  title: "No se ha podido completar el pago",
  description: "Inténtalo de nuevo. Tu saldo no ha cambiado.",
};
const LOAD_ERROR: PaymentError = {
  title: "No se ha podido cargar el formulario de pago",
  description: "Vuelve atrás e inténtalo de nuevo.",
};
const PROCESSING: PaymentError = {
  title: "Pago en proceso",
  description: "El pago se está procesando. Consulta tu saldo en unos minutos.",
};

// Targeta rebutjada (maqueta): el motiu que dona Stripe, en castellà, i com continuar.
const declined = (reason: string | undefined): PaymentError => {
  const text = reason?.trim() || "Tu tarjeta ha sido rechazada.";
  const sentence = /[.!?]$/.test(text) ? text : `${text}.`;
  return { title: "Pago rechazado", description: `${sentence} Prueba con otra tarjeta. Tu saldo no ha cambiado.` };
};

// «paying»: Stripe confirma el pagament. «updating»: pagament fet, s'espera que el saldo el reflecteixi.
type Phase = "idle" | "paying" | "updating";

// Pas de pagament: va dins d'`<Elements>`, que li dona Stripe i el formulari de targeta.
export default function DepositPaymentForm({ amountCents, onBack, onPaid }: DepositPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const completeDeposit = useWalletStore((state) => state.completeDeposit);

  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<PaymentError | null>(null);

  // En canviar de pas, el focus va al títol del pagament perquè el lector de pantalla l'anunciï.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements || !ready || phase !== "idle") return;
    setPhase("paying");
    setError(null);

    let succeeded = false;
    try {
      // Només targetes: el backend crea el pagament sense mètodes que redirigeixin.
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (stripeError?.type === "card_error") {
        setError(declined(stripeError.message));
      } else if (stripeError) {
        // Dades incompletes: Stripe ja marca el camp dins del formulari i no és un rebuig.
        if (stripeError.type !== "validation_error") setError(PAYMENT_ERROR);
      } else if (paymentIntent?.status === "succeeded") {
        succeeded = true;
      } else {
        setError(paymentIntent?.status === "processing" ? PROCESSING : PAYMENT_ERROR);
      }
    } catch {
      setError(PAYMENT_ERROR);
    }

    if (!succeeded) {
      // El mateix pagament admet una altra targeta: es pot tornar a provar.
      setPhase("idle");
      return;
    }
    setPhase("updating");
    // null: s'ha sortit de la pàgina mentre s'esperava el saldo.
    if (await completeDeposit()) onPaid();
  };

  const busy = phase !== "idle";
  const shownError = loadFailed ? LOAD_ERROR : error;

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={busy} className="flex flex-col gap-5">
      <h2 ref={heading} tabIndex={-1} className="sr-only">
        Pago con tarjeta
      </h2>

      <dl className="flex items-baseline justify-between gap-4 rounded-lg bg-muted/10 px-4 py-3">
        <dt className="text-sm text-muted">Importe a ingresar</dt>
        <dd className="text-base font-semibold tabular-nums text-foreground">{formatEuroCents(amountCents)}</dd>
      </dl>

      {!ready && !loadFailed && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Spinner size="sm" color="current" aria-hidden="true" />
          Cargando el formulario de pago…
        </p>
      )}

      {/* Només targeta (US04.2): sense Link, que demana correu i mòbil, ni moneders. */}
      <PaymentElement
        options={{ layout: "tabs", wallets: { link: "never", applePay: "never", googlePay: "never" } }}
        onReady={() => setReady(true)}
        onLoadError={() => setLoadFailed(true)}
      />

      {shownError && (
        <div role="alert">
          <Alert status="danger" className="rounded-xl bg-danger-soft shadow-none">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title className="font-semibold">{shownError.title}</Alert.Title>
              <Alert.Description className="text-danger-soft-foreground">
                {shownError.description}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      {phase === "updating" && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Spinner size="sm" color="current" aria-hidden="true" />
          Pago completado. Actualizando tu saldo…
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" className="w-full sm:w-auto" isDisabled={busy} onPress={onBack}>
          Volver
        </Button>
        <Button type="submit" className={`${PRIMARY} w-full sm:w-auto`} isDisabled={!stripe || !ready || busy}>
          {busy && <Spinner size="sm" color="current" aria-hidden="true" />}
          {busy ? "Procesando…" : `Pagar ${formatEuroCents(amountCents)}`}
        </Button>
      </div>
    </form>
  );
}
