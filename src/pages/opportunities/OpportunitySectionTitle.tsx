import { ReactNode } from "react";
import Icon, { ICONS } from "./OpportunityIcon";

interface SectionTitleProps {
  id: string;
  icon: keyof typeof ICONS;
  children: ReactNode;
}

const SectionTitle = ({ id, icon, children }: SectionTitleProps) => (
  <h2
    id={id}
    className="mb-[22px] flex items-center gap-3 text-xl leading-[1.35] font-semibold text-foreground"
  >
    <Icon name={icon} className="shrink-0" />
    {children}
  </h2>
);

export default SectionTitle;