import { Link } from "react-router";
import { buttonVariants, Card } from "@heroui/react";

// Es mostra quan un compte sense entitat promotora obre una pàgina reservada a les entitats.
export default function PromoterOnlyNotice() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <Card className="flex max-w-3xl flex-col items-center gap-3 p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Sección solo para entidades promotoras</h1>
        <p className="text-sm text-muted">
          Solo las cuentas registradas como entidad promotora pueden consultar sus oportunidades publicadas.
        </p>
        <Link
          to="/"
          className={`${buttonVariants({ variant: "primary" })} mt-2 bg-warning text-warning-foreground hover:bg-warning/90`}
        >
          Volver al inicio
        </Link>
      </Card>
    </div>
  );
}
