import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { Spinner } from "@heroui/react";
import { useAuthStore } from "../store/useAuthStore";
import PromoterOnlyNotice from "./PromoterOnlyNotice";

interface RequireAuthProps {
  children: ReactNode;
  // Només per a comptes amb entitat promotora: la resta veu un avís amb «Volver al inicio».
  promoter?: boolean;
}

// Rutes privades: el visitant va al login abans de demanar cap dada privada.
export default function RequireAuth({ children, promoter = false }: RequireAuthProps) {
  const account = useAuthStore((state) => state.active_account);
  const sessionChecked = useAuthStore((state) => state.sessionChecked);

  if (account) return promoter && !account.is_promoter ? <PromoterOnlyNotice /> : children;
  if (sessionChecked) return <Navigate to="/login" replace />;

  // En recarregar, esperem la recuperació de la sessió en lloc d'expulsar l'usuari.
  return (
    <div className="flex flex-1 items-center justify-center py-12" role="status">
      <Spinner aria-hidden="true" />
      <span className="sr-only">Comprobando la sesión…</span>
    </div>
  );
}
