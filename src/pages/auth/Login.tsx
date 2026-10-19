import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Card, Input, Label, Spinner, TextField } from "@heroui/react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "../../store/useAuthStore";

const Login = () => {
  // Camps controlats: React conserva els valors que introdueix l’usuari.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Només mostrem errors dels intents fets en aquesta visita, no d’una anterior.
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const status = useAuthStore((state) => state.status);
  const details = useAuthStore((state) => state.details);
  const account = useAuthStore((state) => state.active_account);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const isSubmitting = status === "loading";
  const error = hasSubmitted && status === "error" ? details : "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Gestionem l’enviament amb JavaScript perquè el navegador no recarregui la pàgina.
    event.preventDefault();
    if (isSubmitting) return;
    setHasSubmitted(true);

    // El store crida el servei d’API i retorna el compte amb sessió o null si falla.
    const account = await login({ email, password });
    if (account) {
      navigate("/", { replace: true });
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Card className="w-full max-w-md">
        <Card.Header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
          <Card.Description>
            Accede con tu correo electrónico y tu contraseña.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          {/* Amb una sessió ja iniciada no tornem a demanar les credencials. */}
          {account ? (
            <div role="status" className="flex flex-col gap-4">
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Sesión iniciada</Alert.Title>
                  <Alert.Description>
                    Ya has iniciado sesión con el correo {account.email}.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
              <Link to="/" className="font-medium underline underline-offset-4">
                Ir al inicio
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} aria-label="Iniciar sesión" aria-busy={isSubmitting} className="flex flex-col gap-5">
              {/* El navegador valida el camp obligatori i el format bàsic del correu. */}
              <TextField name="email" type="email" isRequired isDisabled={isSubmitting}>
                <Label>Correo electrónico</Label>
                <Input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </TextField>
              <TextField name="password" type="password" isRequired isDisabled={isSubmitting}>
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </TextField>
              {/* role="alert" anuncia els errors a les tecnologies d’assistència. */}
              {error && (
                <div role="alert">
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                </div>
              )}
              {/* Desactivem l’enviament i mostrem un indicador mentre esperem la resposta. */}
              <Button
                type="submit"
                variant="primary"
                isDisabled={isSubmitting}
                className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
              >
                {isSubmitting && <Spinner size="sm" color="current" />}
                {isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
              </Button>
            </form>
          )}
        </Card.Content>
        {!account && (
          <Card.Footer className="flex flex-wrap gap-1 text-sm">
            <span className="text-muted">¿Aún no tienes una cuenta?</span>
            <Link to="/register" className="font-medium underline underline-offset-4">Regístrate</Link>
          </Card.Footer>
        )}
      </Card>
    </main>
  );
};

export default Login;
