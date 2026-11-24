import Section from "./OpportunitySection";
import SectionTitle from "./OpportunitySectionTitle";
import { formatDate } from "./opportunityFormat";

export interface TimelineItem {
  label: string;
  date: string;
}

interface OpportunityTimelineProps {
  items: TimelineItem[];
  now: number;
}

// Fites del projecte; cada pàgina decideix quines hi van i omet les que no tenen data.
const OpportunityTimeline = ({ items, now }: OpportunityTimelineProps) => (
  <Section id="dates-title">
    <SectionTitle id="dates-title" icon="calendar">
      Fechas del proyecto
    </SectionTitle>
    <ol className="mt-6 ml-3 border-l border-border pl-[22px]">
      {items.map((item) => {
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
);

export default OpportunityTimeline;
