import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Card, Input, Label, Spinner, TextField } from "@heroui/react";
import { Link } from "react-router";
import { useAuthStore } from "../../store/useAuthStore";

const Register = () => {
  // Camps controlats: React conserva els valors que introdueix l’usuari.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // La pàgina conserva les dades del formulari; el store gestiona la petició.
  const [validationError, setValidationError] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const status = useAuthStore((state) => state.registrationStatus);
  const details = useAuthStore((state) => state.registrationDetails);
  const register = useAuthStore((state) => state.register);
  const resetRegistration = useAuthStore((state) => state.resetRegistration);
  const isSubmitting = status === "loading";
  const error = validationError || details;

  useEffect(() => {
    resetRegistration();
  }, [resetRegistration]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Gestionem l’enviament amb JavaScript perquè el navegador no recarregui la pàgina.
    event.preventDefault();
    if (isSubmitting) return;
    setValidationError("");
    resetRegistration();

    // Array.from compta punts de codi Unicode, com el mínim de 8 caràcters del backend.
    // Aquestes comprovacions ajuden l’usuari; el backend torna a validar les dades.
    if (Array.from(password).length < 8) {
      setValidationError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    // bcrypt admet com a màxim 72 bytes: accents i emojis poden ocupar més d’un byte.
    if (new TextEncoder().encode(password).length > 72) {
      setValidationError("La contraseña es demasiado larga. Usa menos caracteres, especialmente si contiene símbolos o emojis.");
      return;
    }

    // El store crida el servei d’API i retorna l’usuari creat o null si falla.
    const user = await register({ email, password });
    if (user) {
      setRegisteredEmail(user.email);
      setPassword("");
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Card className="w-full max-w-md">
        <Card.Header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Crear mi cuenta</h1>
          <Card.Description>
            Regístrate con tu correo electrónico y una contraseña.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          {/* Després del registre, substituïm el formulari per la confirmació. */}
          {registeredEmail ? (
            <div role="status" className="flex flex-col gap-4">
              <Alert status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>Cuenta creada</Alert.Title>
                  <Alert.Description>
                    Tu cuenta con el correo {registeredEmail} se ha creado correctamente. Ya puedes iniciar sesión.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
              <Link to="/login" className="font-medium underline underline-offset-4">
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} aria-label="Crear mi cuenta" aria-busy={isSubmitting} className="flex flex-col gap-5">
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
              {/* El text d’ajuda queda vinculat al camp per als lectors de pantalla. */}
              <TextField name="password" type="password" isRequired isDisabled={isSubmitting}>
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  aria-describedby="register-password-help"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <p id="register-password-help" className="text-sm text-muted">
                  Usa al menos 8 caracteres. Las contraseñas muy largas o con muchos emojis pueden superar el límite permitido.
                </p>
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
              <Button type="submit" variant="primary" isDisabled={isSubmitting} className="w-full">
                {isSubmitting && <Spinner size="sm" color="current" />}
                {isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
              </Button>
            </form>
          )}
        </Card.Content>
        {!registeredEmail && (
          <Card.Footer className="flex flex-wrap gap-1 text-sm">
            <span className="text-muted">¿Ya tienes una cuenta?</span>
            <Link to="/login" className="font-medium underline underline-offset-4">Inicia sesión</Link>
          </Card.Footer>
        )}
      </Card>
    </main>
  );
};

export default Register;
