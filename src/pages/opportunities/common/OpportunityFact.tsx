import { ReactNode } from "react";

interface FactProps {
  label: string;
  className?: string;
  children: ReactNode;
}

const Fact = ({ label, className = "", children }: FactProps) => (
  <div className={`min-w-0 ${className}`}>
    <dt className="text-[13px] leading-normal text-muted">{label}</dt>
    <dd className="mt-1 min-w-0 text-base leading-normal font-semibold break-words text-foreground">
      {children}
    </dd>
  </div>
);

export default Fact;