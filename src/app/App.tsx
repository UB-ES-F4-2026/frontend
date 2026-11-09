import { Navigate, Route, Routes } from "react-router";
import HomePage from "../pages/home/HomePage";
import AppTest from "../pages/test/AppTest";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import TermsOfUse from "../pages/legal/TermsOfUse";
import PrivacyPolicy from "../pages/legal/PrivacyPolicy";
import Header from "../components/Header";
import Opportunities from "../pages/opportunities/Opportunities";

import { useAuthStore } from "../store/useAuthStore";

export default function App() {
  const account = useAuthStore((state) => state.active_account);
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/test" element={<AppTest />} />
          <Route path="/login" element={account ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={account ? <Navigate to="/" replace /> : <Register />} />
          <Route path="/legal/condiciones-de-uso" element={<TermsOfUse />} />
          <Route path="/legal/politica-de-privacidad" element={<PrivacyPolicy />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
