import { useEffect, useRef, type ReactNode } from "react";
import { Alert, Button, Spinner } from "@heroui/react";
import { maskIban } from "../../service/iban";
import { formatEuroCents } from "../../service/money";
import { useWalletStore, type WithdrawalRequest } from "../../store/useWalletStore";

interface WithdrawalConfirmationProps {
  request: WithdrawalRequest;
  // Saldo disponible amb què s'ha validat l'import al primer pas.
  availableCents: number;
  // Torna al primer pas, que conserva les dades.
  onBack: () => void;
  // La retirada s'ha fet i el saldo ja s'ha descomptat.
  onDone: () => void;
}

const PRIMARY = "bg-warning text-warning-foreground hover:bg-warning/90";

const SummaryRow = ({ label, highlighted = false, children }: { label: string; highlighted?: boolean; children: ReactNode }) => (
  <div
    className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 ${highlighted ? "bg-muted/10" : ""}`}
  >
    <dt className="text-muted">{label}</dt>
    <dd className="min-w-0 font-semibold text-foreground wrap-break-word sm:text-right">{children}</dd>
  </div>
);

// Segon pas de la retirada: resum de les dades i confirmació.
export default function WithdrawalConfirmation({ request, availableCents, onBack, onDone }: WithdrawalConfirmationProps) {
  const status = useWalletStore((state) => state.withdrawalStatus);
  const details = useWalletStore((state) => state.withdrawalDetails);
  const withdraw = useWalletStore((state) => state.withdraw);

  // En canviar de pas, el focus va al títol perquè el lector de pantalla l'anunciï.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  const submitting = status === "loading";
  const { amount_cents: amountCents, iban, account_holder: holder } = request;

  const handleConfirm = async () => {
    if (await withdraw(request)) onDone();
  };

  return (
    <div aria-busy={submitting} className="flex flex-col gap-5">
      <div>
        <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold text-foreground focus:outline-none">
          Confirma la retirada
        </h2>
        <p className="mt-1 text-sm text-muted">Revisa los datos antes de confirmar.</p>
      </div>

      <dl className="divide-y divide-border overflow-hidden rounded-xl border border-border text-sm">
        <SummaryRow label="Importe a retirar" highlighted>
          <span className="text-base tabular-nums">{formatEuroCents(amountCents)}</span>
        </SummaryRow>
        <SummaryRow label="IBAN de destino">
          {/* Només els primers i els últims caràcters. El lector de pantalla no llegeix els punts. */}
          <span aria-hidden="true" className="tabular-nums">{maskIban(iban)}</span>
          <span className="sr-only">{`${iban.slice(0, 4)}, terminado en ${iban.slice(-4)}`}</span>
        </SummaryRow>
        <SummaryRow label="Titular de la cuenta">{holder}</SummaryRow>
        <SummaryRow label="Saldo disponible tras la retirada">
          <span className="tabular-nums">{formatEuroCents(availableCents - amountCents)}</span>
        </SummaryRow>
      </dl>

      {/* Una sessió caducada no té missatge: SessionManager ja porta al login. */}
      {status === "error" && details && (
        <div role="alert">
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{details}</Alert.Description>
            </Alert.Content>
          </Alert>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <Button variant="secondary" className="w-full sm:w-auto" isDisabled={submitting} onPress={onBack}>
          Volver
        </Button>
        <Button className={`${PRIMARY} w-full sm:w-auto`} isDisabled={submitting} onPress={() => void handleConfirm()}>
          {submitting && <Spinner size="sm" color="current" aria-hidden="true" />}
          {submitting ? "Procesando…" : "Confirmar retirada"}
        </Button>
      </div>
    </div>
  );
}
