
import { Navigate, Route, Routes } from "react-router";
import HomePage from "../pages/home/HomePage";
import AppTest from "../pages/test/AppTest";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/test" element={<AppTest />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}