import { useEffect } from "react";
import { Button, Card, Spinner } from "@heroui/react";
import { useAuthStore } from "../../store/useAuthStore";
import { useWalletStore } from "../../store/useWalletStore";
import { formatEuroCents } from "../../service/money";

const WalletIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="size-5"
  >
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </svg>
);

export default function MyWalletPage() {
  const accountId = useAuthStore((state) => state.active_account?.id);
  const status = useWalletStore((state) => state.status);
  const details = useWalletStore((state) => state.details);
  const balance = useWalletStore((state) => state.balance);
  const fetchBalance = useWalletStore((state) => state.fetchBalance);
  const reset = useWalletStore((state) => state.reset);

  // Cada entrada (o canvi de client) fa una lectura nova; en sortir es descarta el saldo.
  useEffect(() => {
    if (accountId === undefined) return;
    void fetchBalance();
    return reset;
  }, [accountId, fetchBalance, reset]);

  const isLoading = status === "idle" || status === "loading";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Mi saldo</h1>
          <p className="mt-2 text-muted">Consulta el importe disponible en tu cuenta.</p>
          {/* Avís permanent de la US 04.1: tots els imports d'aquest MVP són simulats. */}
          <p className="mt-1 text-sm text-muted">
            Entorno de simulación. Este saldo no representa dinero real.
          </p>
        </div>

        <section aria-labelledby="balance-label">
          <Card className="gap-0 overflow-hidden p-0 shadow-sm">
            <div className="flex flex-col gap-5 bg-brand p-6 text-brand-foreground sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <h2 id="balance-label" className="text-sm font-medium">
                  Saldo disponible
                </h2>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-warning text-warning-foreground">
                  <WalletIcon />
                </span>
              </div>

              {/* Regió persistent: anuncia la càrrega i el resultat sense moure el focus. */}
              <div aria-live="polite" aria-busy={isLoading} className="min-h-16">
                {isLoading && (
                  <p role="status" className="flex items-center gap-3 text-lg">
                    <Spinner size="sm" color="current" aria-hidden="true" />
                    Cargando saldo…
                  </p>
                )}

                {status === "error" && (
                  <div role="alert" className="flex flex-col items-start gap-3">
                    <p className="text-lg font-medium">{details}</p>
                    <Button variant="secondary" onPress={() => void fetchBalance()}>
                      Reintentar
                    </Button>
                  </div>
                )}

                {status === "success" && balance && (
                  <>
                    <p className="text-[clamp(1.75rem,9vw,3rem)] font-semibold leading-tight tabular-nums wrap-break-word">
                      {formatEuroCents(balance.available_cents)}
                    </p>
                    {balance.available_cents === 0 && (
                      <p className="mt-3 flex items-center gap-2 text-sm">
                        <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                        Tu saldo disponible es de {formatEuroCents(0)}
                      </p>
                    )}
                    {/* El compromès es mostra a part: està reservat i no es pot retirar. */}
                    <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-brand-foreground/20 pt-5">
                      <div className="min-w-0">
                        <dt className="text-sm text-brand-foreground/80">Saldo comprometido</dt>
                        <dd className="text-xl font-semibold tabular-nums wrap-break-word">
                          {formatEuroCents(balance.committed_cents)}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-sm text-brand-foreground/80">Total</dt>
                        <dd className="text-xl font-semibold tabular-nums wrap-break-word">
                          {formatEuroCents(BigInt(balance.available_cents) + BigInt(balance.committed_cents))}
                        </dd>
                      </div>
                    </dl>
                  </>
                )}
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}