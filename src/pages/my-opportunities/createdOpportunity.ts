// Avís que el formulari de creació passa a «Mis oportunidades» a través de l'estat de navegació.
export interface CreatedOpportunityNotice {
  title: string;
  initialContributionCents: number | null;
}

// L'estat de navegació pot venir de qualsevol lloc (o de l'historial): només es llegeix si té la forma esperada.
export const readCreatedOpportunity = (state: unknown): CreatedOpportunityNotice | null => {
  if (typeof state !== "object" || state === null || !("createdOpportunity" in state)) return null;
  const notice = state.createdOpportunity as Partial<CreatedOpportunityNotice> | null;
  if (typeof notice?.title !== "string") return null;
  const cents = notice.initialContributionCents;
  return {
    title: notice.title,
    initialContributionCents: typeof cents === "number" && Number.isSafeInteger(cents) && cents > 0 ? cents : null,
  };
};
