
import { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Chip,
  Separator,
  Spinner,
  Surface,
} from "@heroui/react";
import { useHealthStore } from "../../store/useHealthStore";

const AppTest = () => {
  const status = useHealthStore((state) => state.status);
  const details = useHealthStore((state) => state.details);
  const databaseOk = useHealthStore((state) => state.database_ok);
  const service = useHealthStore((state) => state.service);
  const generalStatusOk = useHealthStore((state) => state.general_status_ok);
  const checkConnection = useHealthStore((state) => state.checkConnection);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  const statusConfig = {
    loading: {
      color: "warning" as const,
      badge: "Conectando",
      label: "Comprobando conexión…",
      description: "Esperando respuesta del backend.",
    },
    success: {
      color: "success" as const,
      badge: "Online",
      label: "Conexión correcta con el backend",
      description: "La API está respondiendo correctamente.",
    },
    error: {
      color: "danger" as const,
      badge: "Offline",
      label: "No se ha podido conectar con el backend",
      description: "Revisa que FastAPI esté levantado y accesible.",
    },
  }[status];

  const isLoading = status === "loading";

  return (
    <Surface
      variant="secondary"
      className="min-h-screen px-4 py-12 sm:px-6 sm:py-20"
    >
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="space-y-4">
          <div className="flex items-center gap-2">
            <Chip variant="soft" color="accent" size="sm">
              <Chip.Label className="font-semibold tracking-wider">
                FINTECH
              </Chip.Label>
            </Chip>
            <Separator orientation="vertical" className="h-4" />
            <Chip variant="tertiary" size="sm">
              <Chip.Label className="tracking-wider">
                DESARROLLO LOCAL
              </Chip.Label>
            </Chip>
          </div>

          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
            El punto de partida del equipo.
          </h1>

          <p className="max-w-xl text-base leading-7 text-muted sm:text-lg">
            React y FastAPI, conectados a través de Docker Compose.
          </p>
        </header>

        <Card className="w-full">
          <Card.Header className="flex w-full justify-between gap-4">
            <div className="space-y-1">
              <Card.Title>Conexión con la API</Card.Title>
              <Card.Description>
                Comprobación del estado del servicio backend y base de datos.
              </Card.Description>
            </div>

            <Chip variant="soft" color={statusConfig.color} size="md">
              {isLoading && (
                <Spinner size="sm" color="current" className="mr-1.5" />
              )}
              <Chip.Label>{statusConfig.badge}</Chip.Label>
            </Chip>
          </Card.Header>

          <Card.Content className="flex flex-col gap-5">
            <Alert status={statusConfig.color}>
              <Alert.Indicator>
                {isLoading ? (
                  <Spinner size="sm" color="warning" />
                ) : undefined}
              </Alert.Indicator>
              <Alert.Content>
                <Alert.Title>{statusConfig.label}</Alert.Title>
                <Alert.Description>
                  {statusConfig.description}
                </Alert.Description>
              </Alert.Content>
            </Alert>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Surface
                variant="tertiary"
                className="flex flex-col justify-between gap-2 rounded-xl p-4"
              >
                <span className="text-xs font-medium text-muted">
                  Servicio Backend
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold">
                    {isLoading ? "Cargando…" : service || "No disponible"}
                  </span>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={service ? "accent" : "default"}
                  >
                    <Chip.Label>{service ? "Identificado" : "N/A"}</Chip.Label>
                  </Chip>
                </div>
              </Surface>

              <Surface
                variant="tertiary"
                className="flex flex-col justify-between gap-2 rounded-xl p-4"
              >
                <span className="text-xs font-medium text-muted">
                  Estado API
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {isLoading
                      ? "Comprobando"
                      : generalStatusOk
                        ? "Operativo"
                        : "Inactivo"}
                  </span>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={
                      isLoading
                        ? "warning"
                        : generalStatusOk
                          ? "success"
                          : "danger"
                    }
                  >
                    <Chip.Label>
                      {isLoading ? "…" : generalStatusOk ? "OK" : "ERROR"}
                    </Chip.Label>
                  </Chip>
                </div>
              </Surface>

              <Surface
                variant="tertiary"
                className="flex flex-col justify-between gap-2 rounded-xl p-4"
              >
                <span className="text-xs font-medium text-muted">
                  Base de Datos
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    {isLoading
                      ? "Comprobando"
                      : databaseOk
                        ? "Conectada"
                        : "Sin conexión"}
                  </span>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={
                      isLoading ? "warning" : databaseOk ? "success" : "danger"
                    }
                  >
                    <Chip.Label>
                      {isLoading ? "…" : databaseOk ? "OK" : "ERROR"}
                    </Chip.Label>
                  </Chip>
                </div>
              </Surface>
            </div>

            {details && (
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  Detalles de la respuesta
                </span>

                <Surface
                  variant="tertiary"
                  className="max-h-72 overflow-auto rounded-xl p-4 font-mono text-sm leading-6 whitespace-pre-wrap break-words"
                >
                  <pre>{details}</pre>
                </Surface>
              </div>
            )}
          </Card.Content>

          <Separator variant="secondary" />

          <Card.Footer className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Endpoint:</span>
              <Chip variant="secondary" size="sm">
                <Chip.Label className="font-mono">/api/health</Chip.Label>
              </Chip>
            </div>

            <Button
              variant="primary"
              onPress={() => void checkConnection()}
              isDisabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading && <Spinner size="sm" color="current" />}
              {isLoading ? "Comprobando…" : "Volver a comprobar"}
            </Button>
          </Card.Footer>
        </Card>

        <Alert status="default">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              Pantalla de comprobación del entorno.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      </main>
    </Surface>
  );
};

export default AppTest;