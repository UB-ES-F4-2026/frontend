import type { Promoter } from "../../../store/useOpportunityStore";
import Fact from "./OpportunityFact";
import Icon from "./OpportunityIcon";
import Section from "./OpportunitySection";
import SectionTitle from "./OpportunitySectionTitle";
import { formatInteger } from "./opportunityFormat";

const OpportunityPromoterSection = ({ promoter }: { promoter: Promoter }) => (
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
          {formatInteger(promoter.published_projects_count)}
        </Fact>
        {promoter.experience_years !== null && (
          <Fact
            label="Años de experiencia"
            className="sm:flex-1 min-[960px]:border-l min-[960px]:border-border min-[960px]:pl-6"
          >
            {formatInteger(promoter.experience_years)}
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
);

export default OpportunityPromoterSection;
