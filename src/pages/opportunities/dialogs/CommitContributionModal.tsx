import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "react-router";
import {
  Alert,
  Button,
  Checkbox,
  Description,
  FieldError,
  Input,
  Label,
  Modal,
  Spinner,
  TextField,
} from "@heroui/react";
import { formatAmountCents, formatEuroCents } from "../../../service/money";
import { useOpportunityStore } from "../../../store/useOpportunityStore";
import { useWalletStore } from "../../../store/useWalletStore";
import Icon from "../common/OpportunityIcon";
import {
  checkContribution,
  formatAmountInput,
  parseEuroAmount,
  requiredMinimumCents,
} from "./contributionAmount";

// Dades de l'oportunitat que necessita el diàleg; independent del tipus d'oportunitat.
export interface ContributionOpportunity {
  id: number;
  title: string;
  target_amount_cents: number;
  committed_cents: number;
  minimum_contribution_cents: number | null;
}

interface CommitContributionModalProps {
  opportunity: ContributionOpportunity;
  onClose: () => void;
}

type Step = "amount" | "confirm" | "done";

// Fins que hi hagi una pàgina d'ingressos, «Ingresar fondos» porta a «Mi saldo».
const DEPOSIT_PATH = "/my-balance";

const PRIMARY = "bg-warning text-warning-foreground hover:bg-warning/90";
const SECONDARY = "bg-warning/15 text-warning hover:bg-warning/25";
const LINK =
  "font-semibold text-warning underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-warning";

const DepositLink = () => (
  <Link to={DEPOSIT_PATH} className={LINK}>
    Ingresar fondos
  </Link>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-5"
  >
    <path d="m5 12 4 4L19 6" />
  </svg>
);

const SummaryItem = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="min-w-0 rounded-lg bg-muted/10 px-3 py-2.5">
    <dt className="text-xs text-muted">{label}</dt>
    <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground wrap-break-word">{children}</dd>
  </div>
);

const CommitContributionModal = ({ opportunity, onClose }: CommitContributionModalProps) => {
  const navigate = useNavigate();

  const walletStatus = useWalletStore((state) => state.status);
  const balance = useWalletStore((state) => state.balance);
  const fetchBalance = useWalletStore((state) => state.fetchBalance);
  const resetWallet = useWalletStore((state) => state.reset);

  const commitStatus = useOpportunityStore((state) => state.commitStatus);
  const commitError = useOpportunityStore((state) => state.commitError);
  const commitDetails = useOpportunityStore((state) => state.commitDetails);
  const commitContribution = useOpportunityStore((state) => state.commitContribution);
  const resetCommitment = useOpportunityStore((state) => state.resetCommitment);

  const [step, setStep] = useState<Step>("amount");
  const [amountText, setAmountText] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState(false);
  const [amountCents, setAmountCents] = useState(0);
  const [acceptedRisks, setAcceptedRisks] = useState(false);
  const [availableAfter, setAvailableAfter] = useState<number | null>(null);

  // En afegir o treure punts de milers, React mouria el cursor al final: el retornem al seu lloc.
  const amountInput = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const input = amountInput.current;
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    if (input && caret !== null && document.activeElement === input) {
      input.setSelectionRange(caret, caret);
    }
  }, [amountText]);

  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const inputType = (event.nativeEvent as InputEvent).inputType || "insertText";
    const { text, caret } = formatAmountInput(input.value, input.selectionStart ?? input.value.length, inputType);
    pendingCaret.current = caret;
    setAmountText(text);
    setAmountError(null);
    setInsufficientFunds(false);
  };

  // En sortir del camp es completa el format: «1.000» → «1.000,00». Si no és vàlid, es deixa
  // tal com està perquè l'error de validació s'entengui.
  const handleAmountBlur = () => {
    const parsed = parseEuroAmount(amountText);
    if ("cents" in parsed) setAmountText(formatAmountCents(parsed.cents));
  };

  // Cada obertura llegeix el saldo actual; en tancar es descarta, com a «Mi saldo».
  useEffect(() => {
    resetCommitment();
    void fetchBalance();
    return () => {
      resetCommitment();
      resetWallet();
    };
  }, [fetchBalance, resetCommitment, resetWallet]);

  const submitting = commitStatus === "loading";
  const remainingCents = Math.max(0, opportunity.target_amount_cents - opportunity.committed_cents);
  const minimumCents = requiredMinimumCents(opportunity.minimum_contribution_cents, remainingCents);
  const availableCents = walletStatus === "success" && balance ? balance.available_cents : null;
  const onlyRemainingAllowed = minimumCents === remainingCents;

  const handleContinue = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (availableCents === null) return;
    const result = checkContribution(amountText, {
      minimumCents: opportunity.minimum_contribution_cents,
      remainingCents,
      availableCents,
    });
    if ("error" in result) {
      setAmountError(result.error);
      setInsufficientFunds(result.insufficientFunds);
      return;
    }
    setAmountCents(result.cents);
    setAcceptedRisks(false);
    resetCommitment();
    setStep("confirm");
  };

  const handleConfirm = async () => {
    const outcome = await commitContribution(opportunity.id, amountCents);
    if (!outcome) return;
    setAvailableAfter(outcome.available_cents);
    setStep("done");
  };

  const handleBack = () => {
    // L'import es conserva per poder-lo corregir.
    resetCommitment();
    setStep("amount");
  };

  return (
    <Modal.Backdrop
      isOpen
      isDismissable={!submitting}
      isKeyboardDismissDisabled={submitting}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-lg">
          {/* Mentre es confirma no es pot tancar: l'aportació ja s'està processant. */}
          {!submitting && <Modal.CloseTrigger aria-label="Cerrar diálogo" />}

          {step === "amount" && (
            <>
              <Modal.Header>
                <Modal.Icon className="bg-warning/15 text-warning">
                  <Icon name="coins" size={20} />
                </Modal.Icon>
                <Modal.Heading>Comprometer aportación</Modal.Heading>
                <p className="text-sm text-muted">{opportunity.title}</p>
              </Modal.Header>
              <form noValidate onSubmit={handleContinue} aria-label="Importe de la aportación">
                <Modal.Body className="flex flex-col gap-5">
                  <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <SummaryItem label="Saldo disponible">
                      {availableCents !== null ? (
                        formatEuroCents(availableCents)
                      ) : walletStatus === "error" ? (
                        "No disponible"
                      ) : (
                        <span role="status" className="inline-flex items-center gap-2 font-normal">
                          <Spinner size="sm" color="current" aria-hidden="true" />
                          Cargando…
                        </span>
                      )}
                    </SummaryItem>
                    <SummaryItem label="Aportación mínima">{formatEuroCents(minimumCents)}</SummaryItem>
                    <SummaryItem label="Pendiente">{formatEuroCents(remainingCents)}</SummaryItem>
                  </dl>

                  {walletStatus === "error" && (
                    <div role="alert" className="flex flex-col items-start gap-2">
                      <Alert status="danger">
                        <Alert.Indicator />
                        <Alert.Content>
                          <Alert.Description>No se ha podido consultar tu saldo.</Alert.Description>
                        </Alert.Content>
                      </Alert>
                      <Button size="sm" variant="secondary" onPress={() => void fetchBalance()}>
                        Reintentar
                      </Button>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <TextField
                      name="amount"
                      validationBehavior="aria"
                      isInvalid={amountError !== null}
                      isRequired
                    >
                      <Label className="text-sm font-medium text-foreground">
                        Importe de la aportación (€)
                      </Label>
                      <Input
                        ref={amountInput}
                        autoFocus
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder={formatAmountCents(minimumCents)}
                        className="h-12 w-full min-w-0 rounded-xl border border-foreground/15 bg-background px-4 text-base tabular-nums text-foreground shadow-none placeholder:text-foreground/40 focus:border-warning focus:ring-2 focus:ring-warning/30"
                        value={amountText}
                        onChange={handleAmountChange}
                        onBlur={handleAmountBlur}
                      />
                      <Description className="text-xs text-muted">
                        {onlyRemainingAllowed
                          ? `Solo quedan ${formatEuroCents(remainingCents)} para alcanzar el objetivo: la aportación debe ser de este importe, sin superar tu saldo disponible.`
                          : `Entre ${formatEuroCents(minimumCents)} y ${formatEuroCents(remainingCents)}, sin superar tu saldo disponible.`}
                      </Description>
                      <FieldError className="text-sm text-danger">{amountError}</FieldError>
                    </TextField>
                    {insufficientFunds && <DepositLink />}
                  </div>
                </Modal.Body>
                <Modal.Footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="secondary" className={SECONDARY} onPress={onClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" className={PRIMARY} isDisabled={availableCents === null}>
                    Continuar
                  </Button>
                </Modal.Footer>
              </form>
            </>
          )}

          {step === "confirm" && (
            <>
              <Modal.Header>
                <Modal.Icon className="bg-warning/15 text-warning">
                  <Icon name="coins" size={20} />
                </Modal.Icon>
                <Modal.Heading>Confirma tu aportación</Modal.Heading>
                <p className="text-sm text-muted">Revisa los datos antes de confirmar.</p>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-4">
                <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border text-sm">
                  <div className="flex items-baseline justify-between gap-4 bg-muted/10 px-4 py-3">
                    <dt className="text-muted">Aportación</dt>
                    <dd className="text-base font-semibold tabular-nums text-foreground">
                      {formatEuroCents(amountCents)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                    <dt className="text-muted">Oportunidad</dt>
                    <dd className="min-w-0 text-right font-semibold text-foreground wrap-break-word">
                      {opportunity.title}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                    <dt className="text-muted">Saldo disponible tras la aportación</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {formatEuroCents((availableCents ?? 0) - amountCents)}
                    </dd>
                  </div>
                </dl>

                <Checkbox
                  name="accept_risks"
                  autoFocus
                  isSelected={acceptedRisks}
                  isDisabled={submitting}
                  onChange={setAcceptedRisks}
                >
                  <Checkbox.Content className="items-start gap-3">
                    <Checkbox.Control className="mt-0.5 size-4 shrink-0 border border-foreground/40">
                      <Checkbox.Indicator className={acceptedRisks ? undefined : "invisible"}>
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-full">
                          <path d="m5 12 4 4L19 6" />
                        </svg>
                      </Checkbox.Indicator>
                    </Checkbox.Control>
                    <Label className="text-sm text-foreground">
                      Entiendo que la inversión conlleva riesgos, que los rendimientos no están
                      garantizados y que el importe quedará comprometido en esta oportunidad.
                    </Label>
                  </Checkbox.Content>
                </Checkbox>

                {commitStatus === "error" && (
                  <div role="alert">
                    <Alert status="danger">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>
                          {commitDetails}
                          {commitError === "insufficient_funds" && (
                            <>
                              {" "}
                              <DepositLink />
                            </>
                          )}
                        </Alert.Description>
                      </Alert.Content>
                    </Alert>
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" className={SECONDARY} isDisabled={submitting} onPress={handleBack}>
                  Volver
                </Button>
                {/* Un error de saldo o de disponibilitat no es resol tornant a confirmar. */}
                <Button
                  className={PRIMARY}
                  isDisabled={
                    !acceptedRisks ||
                    submitting ||
                    commitError === "not_accepted" ||
                    commitError === "insufficient_funds"
                  }
                  onPress={() => void handleConfirm()}
                >
                  {submitting && <Spinner size="sm" color="current" aria-hidden="true" />}
                  {submitting ? "Confirmando…" : "Confirmar aportación"}
                </Button>
              </Modal.Footer>
            </>
          )}

          {step === "done" && (
            <>
              <Modal.Header>
                <Modal.Icon className="bg-success/15 text-success">
                  <CheckIcon />
                </Modal.Icon>
                <Modal.Heading>Aportación comprometida</Modal.Heading>
                <p className="text-sm text-muted">{opportunity.title}</p>
              </Modal.Header>
              <Modal.Body>
                <p role="status" className="text-sm leading-relaxed text-muted">
                  Has comprometido{" "}
                  <strong className="text-foreground">{formatEuroCents(amountCents)}</strong> en esta
                  oportunidad.
                  {availableAfter !== null && (
                    <>
                      {" "}Tu saldo disponible ahora es de{" "}
                      <strong className="text-foreground">{formatEuroCents(availableAfter)}</strong>.
                    </>
                  )}
                </p>
              </Modal.Body>
              <Modal.Footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" className={SECONDARY} onPress={() => navigate("/my-balance")}>
                  Ver mi saldo
                </Button>
                <Button autoFocus className={PRIMARY} onPress={onClose}>
                  Cerrar
                </Button>
              </Modal.Footer>
            </>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
};

export default CommitContributionModal;
