import { useEffect } from "react";
import { useNavigate } from "react-router";
import { SESSION_EXPIRED } from "../service/api";
import { useAuthStore } from "../store/useAuthStore";

// Connecta els avisos de l’API amb el store i la navegació, sense dependències circulars.
export default function SessionManager() {
  const navigate = useNavigate();
  useEffect(() => {
    const onExpired = () => {
      useAuthStore.getState().clearSession();
      navigate("/login", { replace: true });
    };
    window.addEventListener(SESSION_EXPIRED, onExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED, onExpired);
    };
  }, [navigate]);
  useEffect(() => {
    const controller = new AbortController();
    void useAuthStore.getState().restoreSession(controller.signal);
    return () => controller.abort();
  }, []);
  return null;
}
