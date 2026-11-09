import { Card } from "@heroui/react";
import { ReactNode } from "react";

interface SectionProps {
  id: string;
  children: ReactNode;
}

const Section = ({ id, children }: SectionProps) => (
  <section aria-labelledby={id} className="min-w-0">
    <Card className="gap-0 border border-border p-5 shadow-none sm:p-6">{children}</Card>
  </section>
);

export default Section;