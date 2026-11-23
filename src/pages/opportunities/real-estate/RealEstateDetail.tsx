import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@heroui/react";
import {
  useOpportunityStore,
  type RealEstateOpportunityGetResponse,
} from "../../../store/useOpportunityStore";
import RealEstateSkeleton from "./RealEstateSkeleton";
import Icon from "../common/OpportunityIcon";
import Section from "../common/OpportunitySection";
import Fact from "../common/OpportunityFact";
import SectionTitle from "../common/OpportunitySectionTitle";
import LocationMap from "../common/OpportunityLocationMap";
import OpportunityBackLink from "../common/OpportunityBackLink";
import OpportunityFundingCard from "../common/OpportunityFundingCard";
import OpportunityOverview from "../common/OpportunityOverview";
import OpportunityPromoterSection from "../common/OpportunityPromoterSection";
import OpportunityStateMessage from "../common/OpportunityStateMessage";
import OpportunityTimeline from "../common/OpportunityTimeline";
import { buildGalleryImages, formatInteger, splitDescription } from "../common/opportunityFormat";
import { useNow } from "../../../hooks/useNow";
import { useAuthStore } from "../../../store/useAuthStore";
import CommitContributionModal from "../dialogs/CommitContributionModal";

const PURPOSE_MAPPING: Record<string, string> = {
  acquisition: "Adquisición",
  construction: "Construcción",
  renovation: "Rehabilitación",
  acquisition_and_renovation: "Adquisición y rehabilitación"
};

const INTENDED_USE_MAPPING: Record<string, string> = {
  rental: "Alquiler",
  sale: "Venta",
  own_use: "Uso propio"
};

const RealEstateDetailContent = ({ opportunity }: { opportunity: RealEstateOpportunityGetResponse }) => {
  const now = useNow();
  const [isContributionOpen, setContributionOpen] = useState(false);
  const refreshRealEstateOpportunity = useOpportunityStore((state) => state.refreshRealEstateOpportunity);

  const real_estate = opportunity.real_estate;
  const promoter = opportunity.promoter;
  const { intro, summary } = splitDescription(opportunity.description);
  const galleryImages = buildGalleryImages(opportunity, real_estate.images);

  const timeline = [
    { label: "Publicación", date: opportunity.date_published },
    { label: "Fin de financiación", date: opportunity.deadline },
    { label: "Finalización estimada de las obras", date: real_estate.estimated_works_end },
    { label: "Inicio estimado del alquiler", date: real_estate.estimated_rental_start },
  ].filter((item): item is { label: string; date: string } => item.date !== null);

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
          onInvest={() => setContributionOpen(true)}
        />
        {/* Es munta en obrir-lo: cada obertura comença de zero i torna a llegir el saldo. */}
        {isContributionOpen && (
          <CommitContributionModal
            opportunity={opportunity}
            onClose={() => setContributionOpen(false)}
            onRefresh={() => void refreshRealEstateOpportunity(opportunity.id)}
          />
        )}
      </OpportunityOverview>

      <div className="flex flex-col gap-[18px]">
        {promoter && <OpportunityPromoterSection promoter={promoter} />}

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
              <Fact label="Finalidad" className="rounded-lg bg-muted/10 p-4">
                {PURPOSE_MAPPING[real_estate.purpose] || real_estate.purpose}
              </Fact>
              <Fact label="Uso previsto" className="rounded-lg bg-muted/10 p-4">
                {INTENDED_USE_MAPPING[real_estate.intended_use] || real_estate.intended_use}
              </Fact>
            </dl>
          </div>
        </Section>

        {/* Características del inmueble */}
        <Section id="features-title">
          <SectionTitle id="features-title" icon="building">
            Características del inmueble
          </SectionTitle>
          <dl className="flex flex-col gap-6 sm:flex-row">
            <Fact label="Superficie" className="relative pl-10 sm:flex-1">
              <Icon name="surface" className="absolute top-1 left-0 text-foreground" />
              {formatInteger(real_estate.surface_m2)} m²
            </Fact>
            <Fact
              label="Viviendas previstas"
              className="relative pl-10 sm:flex-1 sm:border-l sm:border-border sm:pl-16"
            >
              <Icon name="home" className="absolute top-1 left-0 text-foreground sm:left-6" />
              {formatInteger(real_estate.planned_housing_units)}
            </Fact>
          </dl>
        </Section>

        <OpportunityTimeline items={timeline} now={now} />

        <Section id="location-title">
          <div className="flex flex-col gap-6 min-[960px]:flex-row min-[960px]:items-center">
            <div className="min-w-0 min-[960px]:flex-1">
              <SectionTitle id="location-title" icon="pin">
                Ubicación aproximada
              </SectionTitle>
              <p className="text-sm leading-[1.6] text-muted">{opportunity.location}</p>
            </div>
            <LocationMap
              latitude={real_estate.public_latitude}
              longitude={real_estate.public_longitude}
            />
          </div>
        </Section>
      </div>
    </div>
  );
};

const RealEstateDetail = () => {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const isValidRoute = Number.isInteger(id) && id > 0;

  const status = useOpportunityStore((state) => state.detailStatus);
  const detailId = useOpportunityStore((state) => state.detailId);
  const errorDetails = useOpportunityStore((state) => state.detailDetails);
  const opportunity = useOpportunityStore((state) => state.realEstateOpportunity);
  const fetchRealEstateOpportunity = useOpportunityStore(
    (state) => state.fetchRealEstateOpportunity,
  );
  const navigate = useNavigate();

  const account = useAuthStore((state) => state.active_account);
  const isAuthLoading = useAuthStore((state) => state.status);

  useEffect(() => {
    if (isValidRoute) void fetchRealEstateOpportunity(id);
  }, [fetchRealEstateOpportunity, isValidRoute, id]);

  useEffect(() => {
    if (isAuthLoading !== 'idle' && !account) {
      navigate('/login');
    }
  }, [account]);

  if (!isValidRoute) {
    return (
      <OpportunityStateMessage
        title="Oportunidad no encontrada"
        description="La dirección no corresponde a ninguna oportunidad inmobiliaria."
      />
    );
  }

  // detailId evita mostrar un instante los datos (o el error) de la oportunidad anterior.
  if (detailId !== id || status === "loading") {
    return (
      <RealEstateSkeleton />
    );
  }

  if (status === "error") {
    return (
      <OpportunityStateMessage
        title="No se ha podido cargar la oportunidad"
        description={errorDetails}
        action={<Button onPress={() => void fetchRealEstateOpportunity(id)}>Reintentar</Button>}
      />
    );
  }

  if (!opportunity || opportunity.type !== "real_estate") {
    return (
      <OpportunityStateMessage
        title="Oportunidad no encontrada"
        description="Es posible que se haya retirado o que la dirección no sea correcta."
      />
    );
  }

  return <RealEstateDetailContent opportunity={opportunity} />;
};

export default RealEstateDetail;
