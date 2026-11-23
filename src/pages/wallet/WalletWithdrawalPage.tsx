import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Alert, Button, Card, FieldError, Input, Label, Spinner, TextField } from "@heroui/react";
import AmountInput from "../../components/AmountInput";
import { formatIban, normalizeIban } from "../../service/iban";
import { formatAmountCents, formatEuroCents } from "../../service/money";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore, type WithdrawalRequest } from "../../store/useWalletStore";
import WithdrawalConfirmation from "./WithdrawalConfirmation";
import { checkWithdrawal, type WithdrawalFieldErrors, type WithdrawalFields } from "./withdrawalForm";

const PRIMARY = "bg-warning text-warning-foreground hover:bg-warning/90";
const FIELD =
  "h-12 w-full min-w-0 rounded-xl border border-foreground/15 bg-background px-4 text-base text-foreground shadow-none placeholder:text-foreground/40 focus:border-warning focus:ring-2 focus:ring-warning/30";
const LINK =
  "shrink-0 text-xs font-semibold text-warning underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-warning";

// Dades validades al primer pas: el segon les mostra i les envia en confirmar.
interface Review {
  request: WithdrawalRequest;
  availableCents: number;
}

const EMPTY_FIELDS: WithdrawalFields = { amount: "", iban: "", holder: "" };

export default function WalletWithdrawalPage() {
  const navigate = useNavigate();
  const accountId = useAuthStore((state) => state.active_account?.id);
  const status = useWalletStore((state) => state.status);
  const details = useWalletStore((state) => state.details);
  const balance = useWalletStore((state) => state.balance);
  const fetchBalance = useWalletStore((state) => state.fetchBalance);
  const clearBalance = useWalletStore((state) => state.clearBalance);
  const resetWithdrawal = useWalletStore((state) => state.resetWithdrawal);

  const [fields, setFields] = useState<WithdrawalFields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<WithdrawalFieldErrors>({});
  const [review, setReview] = useState<Review | null>(null);
  // En tornar de la confirmació, el focus torna al camp de l'import.
  const [returned, setReturned] = useState(false);
  const availableId = useId();

  // Cada entrada llegeix el saldo actual i en sortir es descarta, com a «Mi saldo».
  useEffect(() => {
    if (accountId === undefined) return;
    void fetchBalance();
    return clearBalance;
  }, [accountId, fetchBalance, clearBalance]);

  // Cada entrada comença de zero; en sortir es descarta la retirada que no s'ha confirmat.
  useEffect(() => {
    resetWithdrawal();
    return resetWithdrawal;
  }, [resetWithdrawal]);

  // Després de «Continuar» amb errors, el focus va al primer camp que cal corregir.
  const form = useRef<HTMLFormElement>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (attempt > 0) form.current?.querySelector<HTMLElement>("input[aria-invalid='true']")?.focus();
  }, [attempt]);

  const availableCents = status === "success" && balance ? balance.available_cents : null;

  const goToBalance = () => navigate("/my-balance");

  const setField = (name: keyof WithdrawalFields, value: string, clearError = true) => {
    setFields((current) => ({ ...current, [name]: value }));
    if (clearError) setErrors((current) => ({ ...current, [name]: undefined }));
  };

  // En sortir del camp, l'IBAN queda en majúscules i en grups de quatre. Si té altres
  // caràcters, es deixa tal com està perquè l'error s'entengui.
  const handleIbanBlur = () => {
    const iban = normalizeIban(fields.iban);
    if (!/^[A-Z0-9]+$/.test(iban)) return;
    const formatted = formatIban(iban);
    if (formatted !== fields.iban) setField("iban", formatted, false);
  };

  const handleContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (availableCents === null) return;
    const result = checkWithdrawal(fields, availableCents);
    if ("errors" in result) {
      setErrors(result.errors);
      setAttempt((count) => count + 1);
      return;
    }
    const { request } = result;
    // En tornar enrere, els camps es mostren tal com s'enviaran.
    setFields({
      amount: formatAmountCents(request.amount_cents),
      iban: formatIban(request.iban),
      holder: request.account_holder,
    });
    resetWithdrawal();
    setReview({ request, availableCents });
  };

  const handleBack = () => {
    resetWithdrawal();
    setReview(null);
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Retirar fondos</h1>
          <p className="mt-2 text-muted">El importe se transferirá a la cuenta bancaria que indiques.</p>
        </div>

        {/* Avís de la US 04.3: la retirada és simulada i no mou diners reals. */}
        <Alert status="default">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>Entorno de simulación: no se realizará ninguna transferencia real.</Alert.Description>
          </Alert.Content>
        </Alert>

        <Card className="gap-0 p-5 shadow-sm sm:p-6">
          {review ? (
            <WithdrawalConfirmation
              request={review.request}
              availableCents={review.availableCents}
              onBack={handleBack}
              onDone={goToBalance}
            />
          ) : status === "error" ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{details}</Alert.Description>
                </Alert.Content>
              </Alert>
              <Button variant="secondary" onPress={() => void fetchBalance()}>
                Reintentar
              </Button>
            </div>
          ) : availableCents === null ? (
            // El formulari necessita el saldo per validar l'import i per a «Retirar todo».
            <p role="status" className="flex items-center gap-2 text-sm text-muted">
              <Spinner size="sm" color="current" aria-hidden="true" />
              Cargando saldo…
            </p>
          ) : availableCents === 0 ? (
            <p className="text-sm text-muted">No tienes saldo disponible para retirar.</p>
          ) : (
            <form
              ref={form}
              noValidate
              onSubmit={handleContinue}
              aria-label="Datos de la retirada"
              className="flex flex-col gap-5"
            >
              <TextField
                name="amount"
                validationBehavior="aria"
                isInvalid={errors.amount !== undefined}
                isRequired
                aria-describedby={availableId}
                className="flex flex-col gap-1.5"
              >
                <Label className="text-sm font-medium text-foreground">Importe a retirar (€)</Label>
                <AmountInput
                  autoFocus={returned}
                  placeholder="0,00"
                  className="sm:max-w-64"
                  value={fields.amount}
                  onValueChange={(text, reason) => setField("amount", text, reason === "input")}
                />
                <div className="flex items-baseline justify-between gap-4 sm:max-w-64">
                  {/* No és un `Description`: HeroUI l'amaga si el camp té error i la maqueta el manté. */}
                  <p id={availableId} className="text-xs text-muted">
                    Saldo disponible: {formatEuroCents(availableCents)}
                  </p>
                  <button
                    type="button"
                    className={LINK}
                    onClick={() => setField("amount", formatAmountCents(availableCents))}
                  >
                    Retirar todo
                  </button>
                </div>
                <FieldError className="text-sm text-danger">{errors.amount}</FieldError>
              </TextField>

              <TextField
                name="iban"
                validationBehavior="aria"
                isInvalid={errors.iban !== undefined}
                isRequired
                className="flex flex-col gap-1.5"
              >
                <Label className="text-sm font-medium text-foreground">IBAN de destino</Label>
                <Input
                  className={FIELD}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={fields.iban}
                  onChange={(event) => setField("iban", event.target.value)}
                  onBlur={handleIbanBlur}
                />
                <FieldError className="text-sm text-danger">{errors.iban}</FieldError>
              </TextField>

              <TextField
                name="account_holder"
                validationBehavior="aria"
                isInvalid={errors.holder !== undefined}
                isRequired
                className="flex flex-col gap-1.5"
              >
                <Label className="text-sm font-medium text-foreground">Titular de la cuenta</Label>
                {/* El mateix límit que el backend (140 caràcters). */}
                <Input
                  className={FIELD}
                  autoComplete="name"
                  maxLength={140}
                  value={fields.holder}
                  onChange={(event) => setField("holder", event.target.value)}
                />
                <FieldError className="text-sm text-danger">{errors.holder}</FieldError>
              </TextField>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button variant="secondary" className="w-full sm:w-auto" onPress={goToBalance}>
                  Cancelar
                </Button>
                <Button type="submit" className={`${PRIMARY} w-full sm:w-auto`}>
                  Continuar
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
