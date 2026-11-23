import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Alert, Button, Card, Description, FieldError, Label, Spinner, TextField } from "@heroui/react";
import { Elements } from "@stripe/react-stripe-js";
import AmountInput from "../../components/AmountInput";
import { formatAmountCents, formatEuroCents } from "../../service/money";
import { getStripe, stripeAppearance } from "../../service/stripe";
import { DEPOSIT_UNAVAILABLE, MIN_DEPOSIT_CENTS, useWalletStore } from "../../store/useWalletStore";
import DepositPaymentForm from "./DepositPaymentForm";
import { checkDepositAmount } from "./depositAmount";

const PRIMARY = "bg-warning text-warning-foreground hover:bg-warning/90";

// Pagament preparat al backend: el pas de targeta el necessita per confirmar-lo amb Stripe.
interface PreparedPayment {
  amountCents: number;
  clientSecret: string;
}

export default function WalletDepositPage() {
  const navigate = useNavigate();
  const depositStatus = useWalletStore((state) => state.depositStatus);
  const depositDetails = useWalletStore((state) => state.depositDetails);
  const createDepositIntent = useWalletStore((state) => state.createDepositIntent);
  const resetDeposit = useWalletStore((state) => state.resetDeposit);

  // Stripe.js es comença a carregar en entrar, perquè el pas de pagament aparegui abans.
  const [stripePromise] = useState(getStripe);
  const [appearance] = useState(stripeAppearance);

  const [amountText, setAmountText] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [payment, setPayment] = useState<PreparedPayment | null>(null);
  // En tornar del pas de pagament, el focus torna al camp de l'import.
  const [returned, setReturned] = useState(false);

  // Cada entrada comença de zero; en sortir es descarta el pagament que no s'ha completat.
  useEffect(() => {
    resetDeposit();
    return resetDeposit;
  }, [resetDeposit]);

  const preparing = depositStatus === "loading";
  const formError = unavailable ? DEPOSIT_UNAVAILABLE : depositStatus === "error" ? depositDetails : "";

  const goToBalance = () => navigate("/my-balance");

  const handleAmountChange = (text: string, reason: "input" | "blur") => {
    setAmountText(text);
    if (reason === "input") setAmountError(null);
  };

  const handleContinue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (preparing) return;
    const result = checkDepositAmount(amountText);
    if ("error" in result) {
      setAmountError(result.error);
      return;
    }
    setAmountText(formatAmountCents(result.cents));
    // Sense clau publicable no es pot pagar: no es crea cap pagament al backend.
    if (!stripePromise) {
      setUnavailable(true);
      return;
    }
    const intent = await createDepositIntent(result.cents);
    if (intent) setPayment({ amountCents: result.cents, clientSecret: intent.client_secret });
  };

  const handleBack = () => {
    resetDeposit();
    setPayment(null);
    setReturned(true);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex max-w-2xl flex-col gap-6">
        <Link
          to="/my-balance"
          className="w-fit text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Volver a mi saldo
        </Link>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Ingresar fondos</h1>
          <p className="mt-2 text-muted">El pago se procesa con Stripe.</p>
        </div>

        {/* Avís de la US 04.2, com el de «Mi saldo»: tots els pagaments són de prova. */}
        <Alert status="default">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              Entorno de simulación: no se realizará ningún cargo real. Usa una tarjeta de prueba de Stripe.
            </Alert.Description>
          </Alert.Content>
        </Alert>

        <Card className="gap-0 p-5 shadow-sm sm:p-6">
          {payment && stripePromise ? (
            // Un pagament nou (tornar enrere i continuar) necessita un formulari de Stripe nou.
            <Elements
              key={payment.clientSecret}
              stripe={stripePromise}
              options={{ clientSecret: payment.clientSecret, locale: "es", appearance }}
            >
              <DepositPaymentForm amountCents={payment.amountCents} onBack={handleBack} onPaid={goToBalance} />
            </Elements>
          ) : (
            <form
              noValidate
              onSubmit={handleContinue}
              aria-label="Importe a ingresar"
              aria-busy={preparing}
              className="flex flex-col gap-5"
            >
              <TextField
                name="amount"
                validationBehavior="aria"
                isInvalid={amountError !== null}
                isRequired
                isReadOnly={preparing}
                className="flex flex-col gap-1.5"
              >
                <Label className="text-sm font-medium text-foreground">Importe a ingresar (€)</Label>
                <AmountInput
                  autoFocus={returned}
                  placeholder="0,00"
                  className="sm:max-w-64"
                  value={amountText}
                  onValueChange={handleAmountChange}
                />
                <Description className="text-xs text-muted">
                  Importe mínimo: {formatEuroCents(MIN_DEPOSIT_CENTS)}
                </Description>
                <FieldError className="text-sm text-danger">{amountError}</FieldError>
              </TextField>

              {formError && (
                <div role="alert">
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{formError}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button variant="secondary" className="w-full sm:w-auto" isDisabled={preparing} onPress={goToBalance}>
                  Cancelar
                </Button>
                <Button type="submit" className={`${PRIMARY} w-full sm:w-auto`} isDisabled={preparing}>
                  {preparing && <Spinner size="sm" color="current" aria-hidden="true" />}
                  {preparing ? "Preparando pago…" : "Continuar al pago"}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
