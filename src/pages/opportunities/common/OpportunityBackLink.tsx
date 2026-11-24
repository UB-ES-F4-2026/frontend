import { Link } from "react-router";

const FOCUS_RING =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

const OpportunityBackLink = () => (
  <Link
    to="/opportunities"
    className={`inline-flex min-h-12 items-center gap-3 text-sm font-semibold text-foreground underline underline-offset-4 ${FOCUS_RING}`}
  >
    <span aria-hidden="true">←</span> Volver a oportunidades
  </Link>
);

export default OpportunityBackLink;
