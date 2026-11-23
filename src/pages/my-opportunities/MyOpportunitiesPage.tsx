import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Alert, Button, Card, Spinner } from "@heroui/react";
import PromoterOnlyNotice from "../../components/PromoterOnlyNotice";
import { formatEuroCents } from "../../service/money";
import { useAuthStore } from "../../store/useAuthStore";
import { useOpportunityStore } from "../../store/useOpportunityStore";
import { readCreatedOpportunity } from "./createdOpportunity";
import MyOpportunitiesSummary from "./MyOpportunitiesSummary";
import MyOpportunityCard from "./MyOpportunityCard";
import OpportunityTypeDialog from "./OpportunityTypeDialog";

const PRIMARY = "bg-warning text-warning-foreground hover:bg-warning/90";

// «Mis oportunidades» (US05.2): resum i llista de les oportunitats de l'entitat promotora, també
// les finançades, vençudes, tancades i pendents de revisió. La creació (US06.1) comença aquí.
export default function MyOpportunitiesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notice] = useState(() => readCreatedOpportunity(location.state));
  const [choosingType, setChoosingType] = useState(false);

  const accountId = useAuthStore((state) => state.active_account?.id);
  const status = useOpportunityStore((state) => state.myOpportunitiesStatus);
  const error = useOpportunityStore((state) => state.myOpportunitiesError);
  const data = useOpportunityStore((state) => state.myOpportunities);
  const promoterName = useOpportunityStore((state) => state.promoterName);
  const fetchMyOpportunities = useOpportunityStore((state) => state.fetchMyOpportunities);

  // L'avís es mostra una vegada: es treu de l'historial perquè no torni en recarregar.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  // Cada visita torna a consultar l'estat: els imports i els terminis canvien amb el temps.
  useEffect(() => {
    if (accountId !== undefined) void fetchMyOpportunities(accountId);
  }, [accountId, fetchMyOpportunities]);

  // El backend no reconeix l'entitat: el mateix avís que per als comptes sense entitat.
  if (status === "error" && error === "forbidden") return <PromoterOnlyNotice />;

  const opportunities = data?.opportunities ?? [];
  const hasPublished = (data?.summary.published_count ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Mis oportunidades</h1>
            <p className="mt-2 text-muted">Consulta tus oportunidades y cómo avanza su financiación.</p>
            {promoterName && <p className="mt-1 text-sm text-muted">{promoterName}</p>}
          </div>
          <Button className={`${PRIMARY} w-full sm:w-auto`} onPress={() => setChoosingType(true)}>
            <span aria-hidden="true">+</span> Crear oportunidad
          </Button>
        </div>

        {notice && (
          <div role="status">
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Oportunidad enviada a revisión</Alert.Title>
                <Alert.Description>
                  «{notice.title}» se publicará cuando sea aprobada.
                  {notice.initialContributionCents !== null &&
                    ` Se han reservado ${formatEuroCents(notice.initialContributionCents)} de tu saldo como aportación inicial.`}
                </Alert.Description>
              </Alert.Content>
            </Alert>
          </div>
        )}

        {(status === "idle" || status === "loading") && (
          <div role="status" className="flex items-center gap-3 py-12 text-muted">
            <Spinner size="sm" color="current" aria-hidden="true" />
            Cargando tus oportunidades…
          </div>
        )}

        {/* Sense missatge (sessió caducada), SessionManager ja porta al login. */}
        {status === "error" && error && (
          <div role="alert" className="flex flex-col items-start gap-3">
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
            <Button variant="secondary" onPress={() => accountId !== undefined && void fetchMyOpportunities(accountId)}>
              Reintentar
            </Button>
          </div>
        )}

        {status === "success" && data && (
          <>
            {opportunities.length > 0 && <MyOpportunitiesSummary summary={data.summary} />}

            {!hasPublished && (
              <Card className="flex flex-col items-center gap-1 border border-dashed border-border p-8 text-center shadow-none">
                <h2 className="text-lg font-semibold text-foreground">Aún no has publicado ninguna oportunidad</h2>
                <p className="text-sm text-muted">Cuando crees una oportunidad, aparecerá aquí.</p>
              </Card>
            )}

            {opportunities.length > 0 && (
              <section aria-labelledby="my-opportunities-list" className="flex flex-col gap-4">
                <h2 id="my-opportunities-list" className="text-xl font-semibold text-foreground">Oportunidades</h2>
                {/* El backend ja les envia de la publicada més recentment a la més antiga. */}
                <ul className="flex flex-col gap-4">
                  {opportunities.map((opportunity) => (
                    <li key={opportunity.id}>
                      <MyOpportunityCard opportunity={opportunity} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      <OpportunityTypeDialog isOpen={choosingType} onClose={() => setChoosingType(false)} />
    </div>
  );
}
