import { Navigate, NavLink, Route, Routes } from "react-router";
import HomePage from "../pages/home/HomePage";
import AppTest from "../pages/test/AppTest";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

export default function App() {
  return (
    <>
      <header className="border-b border-neutral-200">
        <nav aria-label="Navegación principal" className="mx-auto flex max-w-5xl flex-wrap gap-6 px-6 py-4">
          {[
            { to: "/", label: "Inicio" },
            { to: "/register", label: "Crear cuenta" },
            { to: "/login", label: "Iniciar sesión" },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                isActive ? "font-semibold underline underline-offset-4" : "hover:underline"
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/test" element={<AppTest />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
