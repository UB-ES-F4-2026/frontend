export const ICONS = {
  calendar: "M8 2v4m8-4v4M3 10h18M3 4h18v18H3Z",
  coins:
    "M12 8c5 0 8-1.3 8-3s-3-3-8-3-8 1.3-8 3 3 3 8 3ZM4 5v6c0 1.7 3 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3 3 8 3s8-1.3 8-3v-6",
  info: "M12 8v.01M12 11v6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  promoter: "M4 21V5h16v16M2 21h20M8 9h2m4 0h2M8 13h2m4 0h2M10 21v-4h4v4",
  organization:
    "M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M3 21h18M9 7h1m4 0h1M9 11h1m4 0h1M10 21v-5h4v5",
  document: "M14 2H6v20h12V6l-4-4ZM14 2v5h5M9 12h6M9 16h6",
  building: "M4 21V7h7v14M11 21V3h9v18M2 21h20M7 11v2m0 3v2M15 7h1m-1 4h1m-1 4h1",
  surface:
    "M8 3H3v5m0-5 6 6m7-6h5v5m0-5-6 6M3 16v5h5m-5 0 6-6m12 1v5h-5m5 0-6-6",
  home: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  previous: "m15 18-6-6 6-6",
  next: "m9 18 6-6-6-6",
} as const;

interface IconProps {
  name: keyof typeof ICONS;
  size?: number;
  className?: string;
}

const Icon = ({ name, size = 22, className }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d={ICONS[name]} />
  </svg>
);

export default Icon;