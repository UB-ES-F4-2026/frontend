import { Navigate, NavLink, Route, Routes } from "react-router";
import HomePage from "../pages/home/HomePage";
import AppTest from "../pages/test/AppTest";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Header from "../components/Header";
import Opportunities from "../pages/opportunities/Opportunities";

export default function App() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/test" element={<AppTest />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
