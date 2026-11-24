interface SummaryStatProps {
  label: string;
  value: string;
  // La xifra principal del resum, sobre el color de la marca.
  highlighted?: boolean;
}

// Una xifra dels resums de «Mis oportunidades» i «Mis inversiones». Va dins d'un <dl>.
export default function SummaryStat({ label, value, highlighted = false }: SummaryStatProps) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-5 ${
        highlighted ? "border-transparent bg-brand text-brand-foreground" : "border-border bg-background"
      }`}
    >
      <dt className={`text-sm ${highlighted ? "text-brand-foreground/80" : "text-muted"}`}>{label}</dt>
      <dd className={`text-2xl font-semibold tabular-nums ${highlighted ? "text-brand-foreground" : "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}
