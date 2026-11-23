import type { ReactNode } from "react";
import Gallery, { type GalleryImage } from "./OpportunityGallery";
import Icon from "./OpportunityIcon";

interface OpportunityOverviewProps {
  id: number;
  title: string;
  location: string;
  intro: string | null;
  images: GalleryImage[];
  // Columna dreta: la targeta de finançament i, si n'hi ha, el seu diàleg.
  children: ReactNode;
}

// Capçalera comuna del detall: títol, ubicació, galeria, finançament i avís de risc.
const OpportunityOverview = ({ id, title, location, intro, images, children }: OpportunityOverviewProps) => (
  <section aria-labelledby="opportunity-title">
    <div className="mt-6 flex flex-col gap-6 min-[960px]:flex-row min-[960px]:items-stretch min-[960px]:gap-8">
      {/* Hero: título + galería */}
      <div className="min-w-0 min-[960px]:flex-[1.9]">
        <div className="pb-5">
          <h1
            id="opportunity-title"
            className="text-[clamp(26px,3.5vw,36px)] leading-[1.2] font-semibold tracking-tight text-foreground"
          >
            {title}
          </h1>
          <p className="mt-3 text-sm text-muted">{location}</p>
          {intro && (
            <p className="mt-2 max-w-[65ch] text-base leading-relaxed text-muted">{intro}</p>
          )}
        </div>
        <Gallery key={id} images={images} />
      </div>

      {children}
    </div>

    <p className="mt-7 mb-[18px] flex items-start gap-3 rounded-xl border border-border bg-surface px-[22px] py-[18px] text-sm leading-[1.7] text-muted">
      <Icon name="info" className="mt-0.5 shrink-0 text-foreground" />
      El capital comprometido no equivale a dinero cobrado ni a participaciones adquiridas. Las
      inversiones conllevan riesgos y los rendimientos no están garantizados.
    </p>
  </section>
);

export default OpportunityOverview;
