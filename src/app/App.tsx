import { Navigate, Route, Routes } from "react-router";
import HomePage from "../pages/home/HomePage";
import AppTest from "../pages/test/AppTest";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Header from "../components/Header";
import Opportunities from "../pages/opportunities/Opportunities";
import MyWalletPage from "../pages/wallet/MyWalletPage";
import RequireAuth from "../components/RequireAuth";

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
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/my-balance" element={<RequireAuth><MyWalletPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
