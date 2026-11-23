import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Alert, Button } from "@heroui/react";
import { formatEuroCents } from "../../service/money";
import { readCreatedOpportunity } from "./createdOpportunity";
import OpportunityTypeDialog from "./OpportunityTypeDialog";

const PRIMARY = "bg-warning text-warning-foreground hover:bg-warning/90";

// Versió mínima de «Mis oportunidades»: el llistat d'oportunitats del promotor és a frontend#65.
export default function MyOpportunitiesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [notice] = useState(() => readCreatedOpportunity(location.state));
  const [choosingType, setChoosingType] = useState(false);

  // L'avís es mostra una vegada: es treu de l'historial perquè no torni en recarregar.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Mis oportunidades</h1>
            <p className="mt-2 text-muted">Consulta tus oportunidades y cómo avanza su financiación.</p>
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
      </div>

      <OpportunityTypeDialog isOpen={choosingType} onClose={() => setChoosingType(false)} />
    </div>
  );
}
