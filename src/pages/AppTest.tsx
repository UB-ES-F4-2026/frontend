
import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@heroui/react";

type ConnectionStatus = "loading" | "success" | "error";

type HealthResponse = {
  status: string;
  [key: string]: unknown;
};

const AppTest = () => {
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [details, setDetails] = useState("");

  const checkConnection = useCallback(async () => {
    setStatus("loading");
    setDetails("");

    try {
      const response = await fetch("/api/health", {
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: HealthResponse = await response.json();

      if (data.status !== "ok") {
        throw new Error("Respuesta de salud inesperada");
      }

      setStatus("success");
      setDetails(JSON.stringify(data, null, 2));
    } catch (error: unknown) {
      setStatus("error");

      if (error instanceof Error) {
        setDetails(error.message);
      } else {
        setDetails("Se ha producido un error desconocido.");
      }
    }
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  const statusConfig = {
    loading: {
      label: "Comprobando conexión…",
      description: "Esperando respuesta del backend.",
      dot: "bg-amber-500",
      panel: "border-amber-200 bg-amber-50",
      text: "text-amber-800",
    },
    success: {
      label: "Conexión correcta con el backend",
      description: "La API está respondiendo correctamente.",
      dot: "bg-emerald-500",
      panel: "border-emerald-200 bg-emerald-50",
      text: "text-emerald-800",
    },
    error: {
      label: "No se ha podido conectar con el backend",
      description: "Revisa que FastAPI esté levantado y accesible.",
      dot: "bg-red-500",
      panel: "border-red-200 bg-red-50",
      text: "text-red-800",
    },
  }[status];

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 text-gray-900 sm:px-6 sm:py-20">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-blue-700">
            FINTECH <span className="mx-2 text-gray-300">/</span>
            DESARROLLO LOCAL
          </p>

          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            El punto de partida del equipo.
          </h1>

          <p className="max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
            React y FastAPI, conectados a través de Docker Compose.
          </p>
        </header>

        <Card className="w-full">
          <Card.Header>
            <div className="flex w-full items-center justify-between gap-4">
              <div className="space-y-1">
                <Card.Title>Conexión con la API</Card.Title>
                <Card.Description>
                  Comprobación del estado del servicio backend.
                </Card.Description>
              </div>

              <div
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${statusConfig.panel}`}
                aria-hidden="true"
              >
                {status === "loading" ? (
                  <span className="size-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                ) : status === "success" ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6 text-emerald-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      d="m5 12 4 4L19 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-6 text-red-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 9v4m0 4h.01M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3l-7.6-13.1a2 2 0 0 0-3.4 0Z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
          </Card.Header>

          <Card.Content>
            <div className="flex flex-col gap-5">
              <div
                role="status"
                aria-live="polite"
                className={`flex items-start gap-3 rounded-xl border p-4 ${statusConfig.panel}`}
              >
                <span
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${statusConfig.dot} ${
                    status === "loading" ? "animate-pulse" : ""
                  }`}
                  aria-hidden="true"
                />

                <div className="space-y-1">
                  <p className={`text-sm font-semibold ${statusConfig.text}`}>
                    {statusConfig.label}
                  </p>
                  <p className={`text-sm ${statusConfig.text} opacity-80`}>
                    {statusConfig.description}
                  </p>
                </div>
              </div>

              {details && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    Respuesta del servidor
                  </h3>

                  <pre className="max-h-72 overflow-auto rounded-xl border border-gray-200 bg-gray-950 p-4 text-sm leading-6 whitespace-pre-wrap break-words text-gray-100">
                    {details}
                  </pre>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Endpoint: <code>/api/health</code>
                </p>

                <Button
                  onPress={() => void checkConnection()}
                  isDisabled={status === "loading"}
                  className="w-full sm:w-auto"
                >
                  {status === "loading"
                    ? "Comprobando…"
                    : "Volver a comprobar"}
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>

        <footer className="flex items-start gap-3 text-sm leading-6 text-gray-500">
          <span
            className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700"
            aria-hidden="true"
          >
            i
          </span>
          <p>
            Pantalla de comprobación del entorno. Las funcionalidades del
            producto se desarrollarán aquí.
          </p>
        </footer>
      </div>
    </main>
  );
}

export default AppTest;