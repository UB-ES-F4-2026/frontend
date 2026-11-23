import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Alert, Button } from "@heroui/react";
import {
  useOpportunityStore,
  type BusinessOpportunityGetResponse,
} from "../../../store/useOpportunityStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { useNow } from "../../../hooks/useNow";
import RealEstateSkeleton from "../real-estate/RealEstateSkeleton";
import Icon from "../common/OpportunityIcon";
import { PHASE_LABELS, SECTOR_LABELS } from "../common/businessLabels";
import Section from "../common/OpportunitySection";
import Fact from "../common/OpportunityFact";
import SectionTitle from "../common/OpportunitySectionTitle";
import OpportunityBackLink from "../common/OpportunityBackLink";
import OpportunityFundingCard from "../common/OpportunityFundingCard";
import OpportunityOverview from "../common/OpportunityOverview";
import OpportunityPromoterSection from "../common/OpportunityPromoterSection";
import OpportunityStateMessage from "../common/OpportunityStateMessage";
import OpportunityTimeline from "../common/OpportunityTimeline";
import {
  buildGalleryImages,
  formatCents,
  formatRatio,
  splitDescription,
} from "../common/opportunityFormat";

// La inversió empresarial encara no es pot comprometre al backend (US03.1.2).
const INVESTMENT_UNAVAILABLE =
  "La inversión en oportunidades empresariales estará disponible próximamente.";

const BusinessDetailContent = ({ opportunity }: { opportunity: BusinessOpportunityGetResponse }) => {
  const now = useNow();
  const navigate = useNavigate();
  const account = useAuthStore((state) => state.active_account);
  const [showUnavailable, setShowUnavailable] = useState(false);

  const business = opportunity.business;
  const { intro, summary } = splitDescription(opportunity.description);
  const galleryImages = buildGalleryImages(opportunity);

  // El backend ja envia el percentatge (×100); un valor no numèric no es mostra com a 0.
  const equityOffered = Number(business.equity_offered);
  const equityOfferedLabel = Number.isFinite(equityOffered) ? formatRatio(equityOffered / 100) : "—";

  const timeline = [
    { label: "Publicación", date: opportunity.date_published },
    { label: "Fin de financiación", date: opportunity.deadline },
  ];

  const handleInvest = () => {
    // El detall és públic, però invertir demana sessió.
    if (!account) {
      navigate("/login");
      return;
    }
    setShowUnavailable(true);
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pt-5 pb-14 sm:px-10">
      <OpportunityBackLink />

      <OpportunityOverview
        id={opportunity.id}
        title={opportunity.title}
        location={opportunity.location}
        intro={intro}
        images={galleryImages}
      >
        <OpportunityFundingCard
          opportunity={opportunity}
          now={now}
          onInvest={handleInvest}
          footer={
            showUnavailable && (
              <div role="status" className="mt-3">
                <Alert status="warning">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{INVESTMENT_UNAVAILABLE}</Alert.Description>
                  </Alert.Content>
                </Alert>
              </div>
            )
          }
        />
      </OpportunityOverview>

      <div className="flex flex-col gap-[18px]">
        {opportunity.promoter && <OpportunityPromoterSection promoter={opportunity.promoter} />}

        {/* Resumen del proyecto */}
        <Section id="summary-title">
          <SectionTitle id="summary-title" icon="document">
            Resumen del proyecto
          </SectionTitle>
          <div className="flex flex-col gap-6 min-[960px]:flex-row min-[960px]:gap-10">
            <div className="min-w-0 space-y-4 min-[960px]:flex-1">
              {summary.map((paragraph, index) => (
                <p key={index} className="max-w-[65ch] text-[15px] leading-[1.8] text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
            <dl className="flex flex-col gap-3 min-[960px]:w-[210px] min-[960px]:shrink-0">
              <Fact label="Sector" className="rounded-lg bg-muted/10 p-4">
                {SECTOR_LABELS[business.sector] ?? business.sector}
              </Fact>
              <Fact label="Fase de la empresa" className="rounded-lg bg-muted/10 p-4">
                {PHASE_LABELS[business.phase] ?? business.phase}
              </Fact>
            </dl>
          </div>
        </Section>

        {/* Condiciones de la inversión */}
        <Section id="terms-title">
          <SectionTitle id="terms-title" icon="briefcase">
            Condiciones de la inversión
          </SectionTitle>
          <dl className="flex flex-col gap-6 sm:flex-row">
            <Fact label="Valoración previa a la inversión" className="relative pl-10 sm:flex-1">
              <Icon name="valuation" className="absolute top-1 left-0 text-foreground" />
              {formatCents(business.pre_investment_valuation_cents)}
            </Fact>
            <Fact
              label="Participación ofrecida"
              className="relative pl-10 sm:flex-1 sm:border-l sm:border-border sm:pl-16"
            >
              <Icon name="stake" className="absolute top-1 left-0 text-foreground sm:left-6" />
              {equityOfferedLabel}
              <span className="mt-2 block text-xs font-normal text-muted">
                Si se alcanza el objetivo de financiación
              </span>
            </Fact>
          </dl>
        </Section>

        <OpportunityTimeline items={timeline} now={now} />
      </div>
    </div>
  );
};

const BusinessDetail = () => {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const isValidRoute = Number.isInteger(id) && id > 0;

  const status = useOpportunityStore((state) => state.detailStatus);
  const detailId = useOpportunityStore((state) => state.detailId);
  const errorDetails = useOpportunityStore((state) => state.detailDetails);
  const opportunity = useOpportunityStore((state) => state.businessOpportunity);
  const fetchBusinessOpportunity = useOpportunityStore((state) => state.fetchBusinessOpportunity);

  // A diferència del detall immobiliari, no redirigeix al login: la consulta és pública.
  useEffect(() => {
    if (isValidRoute) void fetchBusinessOpportunity(id);
  }, [fetchBusinessOpportunity, isValidRoute, id]);

  if (!isValidRoute) {
    return (
      <OpportunityStateMessage
        title="Oportunidad no encontrada"
        description="La dirección no corresponde a ninguna oportunidad empresarial."
      />
    );
  }

  // detailId evita mostrar un instant les dades (o l'error) de l'oportunitat anterior.
  if (detailId !== id || status === "loading") {
    return <RealEstateSkeleton />;
  }

  if (status === "error") {
    return (
      <OpportunityStateMessage
        title="No se ha podido cargar la oportunidad"
        description={errorDetails}
        action={<Button onPress={() => void fetchBusinessOpportunity(id)}>Reintentar</Button>}
      />
    );
  }

  // Un identificador d'una oportunitat immobiliària no es mostra en aquesta ruta.
  if (!opportunity || opportunity.type !== "equity") {
    return (
      <OpportunityStateMessage
        title="Oportunidad no encontrada"
        description="Es posible que se haya retirado o que la dirección no sea correcta."
      />
    );
  }

  return <BusinessDetailContent opportunity={opportunity} />;
};

export default BusinessDetail;
