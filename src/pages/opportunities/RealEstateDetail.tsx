import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { Button, Card } from "@heroui/react";
import {
  useOpportunityStore,
  type RealEstateOpportunityGetResponse,
} from "../../store/useOpportunityStore";
import RealEstateSkeleton from "./RealEstateSkeleton";
import Icon, { ICONS } from "./OpportunityIcon";
import Gallery, { GalleryImage } from "./OpportunityGallery";
import Section from "./OpportunitySection";
import Fact from "./OpportunityFact";
import SectionTitle from "./OpportunitySectionTitle";
import LocationMap from "./OpportunityLocationMap";

/* -------------------------------------------------------------------------- */
/*  Formato                                                                   */
/* -------------------------------------------------------------------------- */

// Las fechas se muestran siempre en la hora de la plataforma, no en la del navegador.
const PLATFORM_TIME_ZONE = "Europe/Madrid";

const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const percent = new Intl.NumberFormat("es-ES", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat("es-ES");
const dateFormat = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeZone: PLATFORM_TIME_ZONE,
});
const dateTimeFormat = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: PLATFORM_TIME_ZONE,
});
const offsetFormat = new Intl.DateTimeFormat("es-ES", {
  timeZone: PLATFORM_TIME_ZONE,
  timeZoneName: "longOffset",
});

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

const ASSET_TYPE_MAPPING: Record<string, string> = {
  residential: "Residencial",
  commercial: "Comercial",
  industrial: "Industrial",
  land: "Suelo",
  mixed: "Mixto"
};

const formatCents = (cents: number) => eur.format(cents / 100);

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
};

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
};

const utcOffsetLabel = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = offsetFormat
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  return offset ? offset.replace("GMT", "UTC") : "";
};

// Primer párrafo -> entradilla del hero; el resto -> "Resumen del proyecto".
// Si solo hay un párrafo, se muestra únicamente en el resumen.
const splitDescription = (description: string) => {
  const paragraphs = description
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const hasIntro = paragraphs.length > 1;
  return {
    intro: hasIntro ? paragraphs[0] : null,
    summary: hasIntro ? paragraphs.slice(1) : paragraphs,
  };
};

/** Reloj que se actualiza cada 30 s y al volver a la pestaña (estado de fechas y plazo). */
const useNow = (intervalMs = 30_000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, intervalMs);
    const onVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs]);
  return now;
};

const FOCUS_RING =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const PageShell = ({ children }: { children: ReactNode }) => (
  <div className="mx-auto w-full max-w-[1240px] px-5 pt-5 pb-14 sm:px-10">{children}</div>
);

const BackLink = () => (
  <Link
    to="/opportunities"
    className={`inline-flex min-h-12 items-center gap-3 text-sm font-semibold text-foreground underline underline-offset-4 ${FOCUS_RING}`}
  >
    <span aria-hidden="true">←</span> Volver a oportunidades
  </Link>
);

const RealEstateDetailContent = ({ opportunity }: { opportunity: RealEstateOpportunityGetResponse }) => {
  const now = useNow();

  const real_estate = opportunity.real_estate;
  const promoter = opportunity.promoter;
  const ratio =
    opportunity.target_amount_cents > 0
      ? opportunity.committed_cents / opportunity.target_amount_cents
      : 0;
  const barWidth = Math.min(100, ratio * 100);
  const percentLabel = percent.format(ratio);
  const fundingClosed = now >= new Date(opportunity.deadline).getTime();

  const { intro, summary } = splitDescription(opportunity.description);
  
  let galleryImages: GalleryImage[] = [];
  if(real_estate.images && real_estate.images.length > 0) {
    galleryImages = real_estate.images.map((image, index) => ({
      src: image,
      alt: `Imagen ${index + 1} de ${opportunity.title}`,
    }));
  }
  else{
    if(opportunity.cover_image_url) {
      galleryImages.push({src: opportunity.cover_image_url, alt: `Imagen de ${opportunity.title}`});
    }
    if(promoter.image_url) {
      galleryImages.push({src: promoter.image_url, alt: `Imagen de ${promoter.legal_name}`});
    }
  }

  const timeline = [
    { label: "Publicación", date: opportunity.date_published },
    { label: "Fin de financiación", date: opportunity.deadline },
    { label: "Finalización estimada de las obras", date: real_estate.estimated_works_end },
    { label: "Inicio estimado del alquiler", date: real_estate.estimated_rental_start },
  ].filter((item): item is { label: string; date: string } => item.date !== null);

  return (
    <PageShell>
      <BackLink />

      <section aria-labelledby="opportunity-title">
        <div className="mt-6 flex flex-col gap-6 min-[960px]:flex-row min-[960px]:items-stretch min-[960px]:gap-8">
          {/* Hero: título + galería */}
          <div className="min-w-0 min-[960px]:flex-[1.9]">
            <div className="pb-5">
              <h1
                id="opportunity-title"
                className="text-[clamp(26px,3.5vw,36px)] leading-[1.2] font-semibold tracking-tight text-foreground"
              >
                {opportunity.title}
              </h1>
              <p className="mt-3 text-sm text-muted">{opportunity.location}</p>
              {intro && (
                <p className="mt-2 max-w-[65ch] text-base leading-relaxed text-muted">{intro}</p>
              )}
            </div>
            <Gallery key={opportunity.id} images={galleryImages} />
          </div>

          {/* Financiación */}
          <Card className="min-w-0 gap-0 border border-border p-7 shadow-sm min-[960px]:flex-1">
            <span className="inline-flex items-center self-start rounded-full border border-border bg-muted/10 px-4 py-2 text-xs font-semibold text-foreground">
              <span
                aria-hidden="true"
                className={`mr-2 size-[7px] rounded-full ${fundingClosed ? "bg-muted" : "bg-warning"}`}
              />
              {fundingClosed ? "Plazo finalizado" : "En financiación"}
            </span>

            <p className="mt-5 text-xs text-muted">Capital comprometido</p>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                {formatCents(opportunity.committed_cents)}
              </p>
              <span className="text-[22px] font-semibold whitespace-nowrap text-foreground">
                {percentLabel}
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <span>Objetivo de financiación</span>
              <strong className="text-foreground">{formatCents(opportunity.target_amount_cents)}</strong>
            </div>
            <div
              role="progressbar"
              aria-label="Capital comprometido respecto al objetivo"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(barWidth * 10) / 10}
              aria-valuetext={`${percentLabel} del objetivo`}
              className="my-2 h-2.5 w-full overflow-hidden rounded-full bg-muted/20"
            >
              <div className="h-full rounded-full bg-warning" style={{ width: `${barWidth}%` }} />
            </div>
            <p className="text-sm font-semibold text-foreground">{percentLabel} del objetivo</p>

            <dl className="mt-7 flex flex-col gap-7 border-t border-border pt-7">
              <div className="relative pl-[34px]">
                <Icon name="calendar" className="absolute top-0.5 left-0 text-foreground" />
                <dt className="text-xs text-muted">Fecha límite de financiación</dt>
                <dd className="mt-2 text-sm font-semibold text-foreground">
                  <time dateTime={opportunity.deadline}>
                    {formatDateTime(opportunity.deadline)}
                    <span className="mt-1 block text-xs font-normal text-muted">
                      Hora de Madrid ({utcOffsetLabel(opportunity.deadline)})
                    </span>
                  </time>
                </dd>
              </div>
              {opportunity.minimum_contribution_cents !== null && (
                <div className="relative pl-[34px]">
                  <Icon name="coins" className="absolute top-0.5 left-0 text-foreground" />
                  <dt className="text-xs text-muted">Aportación mínima</dt>
                  <dd className="mt-2 text-sm font-semibold text-foreground">
                    {formatCents(opportunity.minimum_contribution_cents)}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>

        <p className="mt-7 mb-[18px] flex items-start gap-3 rounded-xl border border-border bg-surface px-[22px] py-[18px] text-sm leading-[1.7] text-muted">
          <Icon name="info" className="mt-0.5 shrink-0 text-foreground" />
          El capital comprometido no equivale a dinero cobrado ni a participaciones adquiridas. Las
          inversiones conllevan riesgos y los rendimientos no están garantizados.
        </p>
      </section>

      <div className="flex flex-col gap-[18px]">
        {/* Entidad promotora */}
        {promoter && (
          <Section id="promoter-title">
            <SectionTitle id="promoter-title" icon="promoter">
              Entidad promotora
            </SectionTitle>
            <div className="flex flex-col gap-6 min-[960px]:flex-row min-[960px]:items-center">
              <div className="flex min-w-0 items-center gap-4 min-[960px]:flex-[1.2]">
                <span
                  role="img"
                  aria-label="Imagen genérica de organización"
                  className="grid size-11 shrink-0 place-content-center rounded-full border border-border bg-muted/10 text-foreground"
                >
                  <Icon name="organization" size={24} />
                </span>
                <p className="text-base font-semibold text-foreground">{promoter.legal_name}</p>
              </div>
              <dl className="flex min-w-0 flex-col gap-5 sm:flex-row sm:gap-6 min-[960px]:flex-[2]">
                <Fact
                  label="Proyectos publicados"
                  className="sm:flex-1 min-[960px]:border-l min-[960px]:border-border min-[960px]:pl-6"
                >
                  {integer.format(promoter.published_projects_count)}
                </Fact>
                {promoter.experience_years !== null && (
                  <Fact
                    label="Años de experiencia"
                    className="sm:flex-1 min-[960px]:border-l min-[960px]:border-border min-[960px]:pl-6"
                  >
                    {integer.format(promoter.experience_years)}
                    <span className="mt-2 block text-xs font-normal text-muted">
                      Dato declarado por la entidad
                    </span>
                  </Fact>
                )}
                {promoter.location && (
                  <Fact
                    label="Ubicación"
                    className="sm:flex-1 min-[960px]:border-l min-[960px]:border-border min-[960px]:pl-6"
                  >
                    {promoter.location}
                  </Fact>
                )}
              </dl>
            </div>
          </Section>
        )}

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
              {integer.format(real_estate.surface_m2)} m²
            </Fact>
            <Fact
              label="Viviendas previstas"
              className="relative pl-10 sm:flex-1 sm:border-l sm:border-border sm:pl-16"
            >
              <Icon name="home" className="absolute top-1 left-0 text-foreground sm:left-6" />
              {integer.format(real_estate.planned_housing_units)}
            </Fact>
          </dl>
        </Section>

        {/* Fechas del proyecto */}
        <Section id="dates-title">
          <SectionTitle id="dates-title" icon="calendar">
            Fechas del proyecto
          </SectionTitle>
          <ol className="mt-6 ml-3 border-l border-border pl-[22px]">
            {timeline.map((item) => {
              const past = new Date(item.date).getTime() <= now;
              return (
                <li
                  key={item.label}
                  data-past={past}
                  className="relative flex flex-col gap-1.5 pb-[26px] pl-3 before:absolute before:top-[5px] before:-left-[29px] before:size-3 before:rounded-full before:border-2 before:border-foreground before:bg-surface last:pb-0 data-[past=true]:before:bg-foreground min-[960px]:flex-row min-[960px]:items-baseline min-[960px]:gap-6"
                >
                  <p className="text-sm leading-[1.6] font-semibold text-foreground min-[960px]:flex-[0_0_300px]">
                    {item.label}
                  </p>
                  <time
                    dateTime={item.date}
                    className="text-sm leading-[1.6] text-muted min-[960px]:flex-1"
                  >
                    {formatDate(item.date)}
                  </time>
                  <span className="self-start rounded-full bg-muted/10 px-2.5 py-[3px] text-xs whitespace-nowrap text-muted min-[960px]:self-auto">
                    {past ? "Fecha pasada" : "Fecha futura"}
                  </span>
                </li>
              );
            })}
          </ol>
        </Section>

        {/* Ubicación aproximada */}
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
    </PageShell>
  );
};

/* -------------------------------------------------------------------------- */
/*  Página (carga, errores y rutas inválidas)                                 */
/* -------------------------------------------------------------------------- */

interface StateMessageProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

const StateMessage = ({ title, description, action }: StateMessageProps) => (
  <PageShell>
    <BackLink />
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {description && <p className="max-w-[65ch] text-sm text-muted">{description}</p>}
      {action}
    </div>
  </PageShell>
);

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

  useEffect(() => {
    if (isValidRoute) void fetchRealEstateOpportunity(id);
  }, [fetchRealEstateOpportunity, isValidRoute, id]);

  if (!isValidRoute) {
    return (
      <StateMessage
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
      <StateMessage
        title="No se ha podido cargar la oportunidad"
        description={errorDetails}
        action={<Button onPress={() => void fetchRealEstateOpportunity(id)}>Reintentar</Button>}
      />
    );
  }

  if (!opportunity || opportunity.type !== "real_estate") {
    return (
      <StateMessage
        title="Oportunidad no encontrada"
        description="Es posible que se haya retirado o que la dirección no sea correcta."
      />
    );
  }

  return <RealEstateDetailContent opportunity={opportunity} />;
};

export default RealEstateDetail;