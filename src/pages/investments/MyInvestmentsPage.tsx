import { useEffect } from "react";
import { Link } from "react-router";
import { Alert, Button, buttonVariants, Card, Spinner } from "@heroui/react";
import { useInvestmentStore } from "../../store/useInvestmentStore";
import InvestmentCard from "./InvestmentCard";
import InvestmentsSummary from "./InvestmentsSummary";

// «Mis inversiones» (US05.1): totes les inversions de l'usuari amb l'estat actual de cada
// oportunitat. Només lectura: des d'aquí no es pot invertir ni cancel·lar.
export default function MyInvestmentsPage() {
  const status = useInvestmentStore((state) => state.status);
  const details = useInvestmentStore((state) => state.details);
  const data = useInvestmentStore((state) => state.investments);
  const fetchInvestments = useInvestmentStore((state) => state.fetchInvestments);

  // Cada visita torna a consultar l'estat: el progrés i els terminis canvien amb el temps.
  useEffect(() => {
    void fetchInvestments();
  }, [fetchInvestments]);

  const investments = data?.commitments ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex max-w-5xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Mis inversiones</h1>
          <p className="mt-2 text-muted">Consulta las inversiones que has comprometido y el estado de cada oportunidad.</p>
          <p className="mt-1 text-sm text-muted">Entorno de simulación. Estos importes no representan dinero real.</p>
        </div>

        {(status === "idle" || status === "loading") && (
          <div role="status" className="flex items-center gap-3 py-12 text-muted">
            <Spinner size="sm" color="current" aria-hidden="true" />
            Cargando tus inversiones…
          </div>
        )}

        {/* Sense missatge (sessió caducada), SessionManager ja porta al login. */}
        {status === "error" && details && (
          <div role="alert" className="flex flex-col items-start gap-3">
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{details}</Alert.Description>
              </Alert.Content>
            </Alert>
            <Button variant="secondary" onPress={() => void fetchInvestments()}>
              Reintentar
            </Button>
          </div>
        )}

        {status === "success" && data && investments.length === 0 && (
          <Card className="flex flex-col items-center gap-1 border border-dashed border-border p-8 text-center shadow-none">
            <h2 className="text-lg font-semibold text-foreground">Aún no has realizado ninguna inversión</h2>
            <p className="text-sm text-muted">Cuando comprometas una inversión en una oportunidad, aparecerá aquí.</p>
            <Link
              to="/opportunities"
              className={`${buttonVariants({ variant: "primary" })} mt-3 bg-warning text-warning-foreground hover:bg-warning/90`}
            >
              Explorar oportunidades
            </Link>
          </Card>
        )}

        {status === "success" && data && investments.length > 0 && (
          <>
            <InvestmentsSummary summary={data.summary} />
            <section aria-labelledby="investments-list" className="flex flex-col gap-4">
              <h2 id="investments-list" className="text-xl font-semibold text-foreground">Inversiones</h2>
              {/* El backend ja les envia de la més recent a la més antiga, cada compromís per separat. */}
              <ul className="flex flex-col gap-4">
                {investments.map((investment) => (
                  <li key={investment.id}>
                    <InvestmentCard investment={investment} />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
