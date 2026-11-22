import type { ReactNode } from "react";
import OpportunityBackLink from "./OpportunityBackLink";

interface OpportunityStateMessageProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

// Estats sense contingut del detall: no trobada o error de càrrega.
const OpportunityStateMessage = ({ title, description, action }: OpportunityStateMessageProps) => (
  <div className="mx-auto w-full max-w-[1240px] px-5 pt-5 pb-14 sm:px-10">
    <OpportunityBackLink />
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {description && <p className="max-w-[65ch] text-sm text-muted">{description}</p>}
      {action}
    </div>
  </div>
);

export default OpportunityStateMessage;
