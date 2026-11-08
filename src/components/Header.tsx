import { Link, NavLink, useNavigate } from "react-router";
import { Button, buttonVariants, Chip } from "@heroui/react";

import { useAuthStore } from "../store/useAuthStore";

const Header = () => {
  const account = useAuthStore((state) => state.active_account);
  const status = useAuthStore((state) => state.status);
  const details = useAuthStore((state) => state.details);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const handleLogout = async () => {
    if (await logout()) navigate("/login", { replace: true });
  };
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
        ? "font-semibold text-warning"
        : "font-medium text-muted transition-colors hover:text-foreground";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/70 backdrop-blur-md">
      <nav
        aria-label="Navegación principal"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6"
      >

        <Link to="/" className="flex gap-3 items-center">
          <Chip variant="primary" color="warning" size="lg">
            <Chip.Label>
              ES
            </Chip.Label>
          </Chip>
          <p className="font-bold tracking-tight text-foreground">Grupo F4</p>
        </Link>

        <div className="hidden items-center gap-8 sm:flex">
          <NavLink to="/" end className={navLinkClass}>Inicio</NavLink>
          <NavLink to="/opportunities" className={navLinkClass}>Oportunidades</NavLink>
        </div>

        <div className="flex items-center gap-4">
          {account && (
            <>
              <Button variant="danger" size="lg" onPress={handleLogout} isDisabled={status === "loading"}>
                Cerrar sesión
              </Button>
              {status === "error" && <span role="alert">{details}</span>}
            </>
          )}
          <NavLink
            to="/login"
            className={(s) => `${navLinkClass(s)} hidden lg:block`}
          >
            Iniciar sesión
          </NavLink>

          <NavLink
            to="/register"
            className={`${buttonVariants({ variant: "primary", size: "lg" })} bg-warning text-warning-foreground hover:bg-warning/90`}
          >
            Registrarse
          </NavLink>
        </div>

      </nav>
    </header>
  );
};

export default Header;
