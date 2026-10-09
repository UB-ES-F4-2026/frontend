
import { Navigate, Route, Routes } from "react-router";
import HomePage from "../pages/HomePage";
import AppTest from "../pages/AppTest";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/test" element={<AppTest />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}