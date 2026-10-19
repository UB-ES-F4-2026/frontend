import { buttonVariants, Chip } from "@heroui/react";
import { NavLink } from "react-router";
import cityDawn from "../../assets/city_dawn.jpg";

export default function HomePage() {
  return (
    <section className="relative isolate flex flex-1 flex-col overflow-hidden">
      <img src={cityDawn} className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-6 px-6 py-24">
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
          Encuentra tu próxima{" "}
          <span className="text-yellow-400">oportunidad de inversión</span>
        </h1>

        <p className="max-w-xl text-lg text-white/80">
          Adquiere participaciones en campañas de financiación colectiva de bienes inmobiliaros o acciones de startups.
        </p>

        <div className="flex flex-wrap gap-3">
          <NavLink
            to="/opportunities"
            className={`${buttonVariants({ variant: "primary", size: "lg" })} bg-warning text-warning-foreground hover:bg-warning/90`}
          >
            Ver oportunidades
          </NavLink>
          <NavLink
            to="/register"
            className={`${buttonVariants({ variant: "secondary", size: "lg" })} border border-warning bg-transparent text-warning hover:bg-warning/10`}     
          >
            Crear cuenta
          </NavLink>
        </div>
      </div>
    </section>
  );
}