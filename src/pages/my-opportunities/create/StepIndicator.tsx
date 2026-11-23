interface StepIndicatorProps {
  steps: string[];
  current: number;
}

const CheckIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" className="size-3">
    <path d="m5 12 4 4L19 6" />
  </svg>
);

// Passos del formulari: els completats amb una marca, l'actual destacat.
export default function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <ol aria-label="Pasos" className="flex flex-wrap gap-x-6 gap-y-2">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? "bg-warning text-warning-foreground"
                  : done
                    ? "bg-foreground text-background"
                    : "border border-foreground/25 text-muted"
              }`}
            >
              {done ? <CheckIcon /> : index + 1}
            </span>
            <span className={active ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted"}>
              {label}
            </span>
            {done && <span className="sr-only">(completado)</span>}
          </li>
        );
      })}
    </ol>
  );
}
