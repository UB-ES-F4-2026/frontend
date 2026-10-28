import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { Link } from "react-router";
import cityDawn from "../../assets/city_dawn.jpg";
import { useAuthStore } from "../../store/useAuthStore";

const Register = () => {
  // Els dos passos comparteixen component i ruta; les dades es conserven en canviar de pas.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  // Camps controlats: React conserva els valors que introdueix l’usuari.
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);
  const [documentNotice, setDocumentNotice] = useState("");
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

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    // Gestionem l’enviament amb JavaScript perquè el navegador no recarregui la pàgina.
    event.preventDefault();
    if (isSubmitting) return;
    setValidationError("");
    resetRegistration();

    // Avançar de pas no envia cap petició al backend.
    if (step === 1) {
      setStep(2);
      return;
    }

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

    if (password !== confirmPassword) {
      setValidationError("Las contraseñas no coinciden.");
      return;
    }

    // El store crida el servei d’API i retorna l’usuari creat o null si falla.
    const user = await register({ email, password });
    if (user) {
      setRegisteredEmail(user.email);
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <section style={{ overflowAnchor: "none" }} className="relative isolate flex flex-1 overflow-hidden bg-[#10151f] text-white md:h-[calc(100dvh-4rem-1px)] md:flex-none">
      {/* L’alçada de la fotografia depèn de la finestra, no del contingut de cada pas. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 md:right-[38%]">
        <img src={cityDawn} alt="" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#10151f]/70 via-[#10151f]/85 to-[#10151f] md:bg-gradient-to-r md:from-[#10151f]/10 md:via-[#10151f]/40 md:to-[#10151f]" />
      </div>
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-6 sm:px-10 md:h-full md:min-h-0 md:grid-cols-2 md:gap-12 lg:gap-24 lg:px-16">
        <aside className="flex flex-col justify-end md:min-h-0 md:pb-8">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-white/75">Personas y posibilidades</p>
          <h2 className="max-w-md text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Las grandes ideas comienzan <span className="block text-warning">contigo.</span>
          </h2>
        </aside>
        <div className="w-full max-w-md self-center justify-self-center md:h-[30rem] md:max-h-full md:overflow-y-auto md:pr-2">
          <header className="mb-4 flex flex-col gap-3">
            {!registeredEmail && (
              <div>
                <ol aria-label="Pasos del registro" className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                  {["Datos personales", "Datos de acceso"].map((label, index) => (
                    <li key={label} aria-current={step === index + 1 ? "step" : undefined}
                      className={`flex items-center gap-1.5 ${step === index + 1 ? "font-semibold text-white" : "text-white/60"}`}>
                      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${step === index + 1 ? "border-warning bg-warning text-warning-foreground" : "border-white/30"}`}>
                        {index + 1}
                      </span>
                      {label}
                    </li>
                  ))}
                </ol>
                <p role="status" className="sr-only">Paso {step} de 2</p>
              </div>
            )}
            <h1 ref={headingRef} tabIndex={-1} className="outline-none text-3xl font-bold tracking-tight sm:text-4xl">Crear mi cuenta</h1>
            <p className="max-w-sm text-sm leading-snug text-white/65">
              {step === 1 ? "Comienza con tus datos personales. Todos los campos son obligatorios." : "Configura los datos de acceso a tu cuenta."}
            </p>
          </header>
          <div>
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
                <Link to="/login" className="font-medium text-warning underline underline-offset-4 hover:text-warning/80">
                  Ir al inicio de sesión
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} aria-label="Crear mi cuenta" aria-busy={isSubmitting} className="flex flex-col gap-3">
                {/* El navegador valida el camp obligatori i el format bàsic del correu. */}
                {step === 1 && (
                  <>
                    <TextField name="fullName" isRequired isDisabled={isSubmitting}>
                      <Label className="text-sm font-medium text-white/90">Nombre y apellidos</Label>
                      <Input
                        className="h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-white shadow-none placeholder:text-white/40 hover:bg-white/10 focus:border-warning focus:ring-2 focus:ring-warning/30"
                        name="fullName"
                        autoComplete="name"
                        placeholder="Tu nombre y apellidos"
                        required
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                      />
                    </TextField>
                    <TextField name="email" type="email" isRequired isDisabled={isSubmitting}>
                      <Label className="text-sm font-medium text-white/90">Correo electrónico</Label>
                      <Input
                        className="h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-white shadow-none placeholder:text-white/40 hover:bg-white/10 focus:border-warning focus:ring-2 focus:ring-warning/30"
                        type="email"
                        name="email"
                        autoComplete="email"
                        placeholder="nombre@ejemplo.com"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </TextField>
                    <TextField name="phone" type="tel" isRequired isDisabled={isSubmitting}>
                      <Label className="text-sm font-medium text-white/90">Número de teléfono</Label>
                      <Input
                        className="h-10 rounded-xl border border-white/15 bg-white/5 px-4 text-white shadow-none placeholder:text-white/40 hover:bg-white/10 focus:border-warning focus:ring-2 focus:ring-warning/30"
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        placeholder="612 345 678"
                        required
                        aria-describedby="register-phone-help"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                      <p id="register-phone-help" className="text-xs leading-relaxed text-white/65">
                        Número español o internacional con prefijo +.
                      </p>
                    </TextField>
                  </>
                )}
                {/* El text d’ajuda queda vinculat al camp per als lectors de pantalla. */}
                {step === 2 && (
                  <>
                    {[
                      { name: "password", label: "Contraseña", value: password, setValue: setPassword, visible: showPassword, setVisible: setShowPassword },
                      { name: "confirmPassword", label: "Confirma la contraseña", value: confirmPassword, setValue: setConfirmPassword, visible: showConfirmPassword, setVisible: setShowConfirmPassword },
                    ].map((field) => (
                      <TextField key={field.name} name={field.name} type={field.visible ? "text" : "password"} isRequired isDisabled={isSubmitting}>
                        <Label className="text-sm font-medium text-white/90">{field.label}</Label>
                        <div className="relative">
                          <Input
                            className="h-10 w-full rounded-xl border border-white/15 bg-white/5 py-0 pl-4 pr-12 text-white shadow-none placeholder:text-white/40 hover:bg-white/10 focus:border-warning focus:ring-2 focus:ring-warning/30"
                            type={field.visible ? "text" : "password"}
                            name={field.name}
                            autoComplete="new-password"
                            required
                            aria-describedby={field.name === "password" ? "register-password-help" : undefined}
                            value={field.value}
                            onChange={(event) => field.setValue(event.target.value)}
                          />
                          <button
                            type="button"
                            disabled={isSubmitting}
                            aria-label={`${field.visible ? "Ocultar" : "Mostrar"} ${field.name === "password" ? "contraseña" : "confirmación de contraseña"}`}
                            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-white/65 hover:text-warning focus-visible:outline-2 focus-visible:outline-warning disabled:opacity-50"
                            onClick={() => field.setVisible(!field.visible)}
                          >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                              <circle cx="12" cy="12" r="3" />
                              {field.visible && <path d="m3 3 18 18" />}
                            </svg>
                          </button>
                        </div>
                        {field.name === "password" && (
                          <p id="register-password-help" className="text-xs leading-relaxed text-white/65">
                            La contraseña debe tener entre 8 y 72 caracteres.
                          </p>
                        )}
                      </TextField>
                    ))}
                    {/* Les caselles conserven el valor; els documents encara són provisionals. */}
                    <div className="space-y-2 text-xs leading-relaxed text-white/80">
                      <div className="flex items-start gap-3">
                        <input id="register-terms" type="checkbox" required disabled={isSubmitting}
                          className="mt-1 size-4 shrink-0 accent-amber-400"
                          checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
                        <div>
                          <label htmlFor="register-terms">Acepto las condiciones de uso.</label>{" "}
                          <button type="button" className="text-warning underline underline-offset-4 hover:text-warning/80"
                            onClick={() => setDocumentNotice("Condiciones de uso")}>Consultar condiciones</button>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <input id="register-privacy" type="checkbox" required disabled={isSubmitting}
                          className="mt-1 size-4 shrink-0 accent-amber-400"
                          checked={readPrivacy} onChange={(event) => setReadPrivacy(event.target.checked)} />
                        <div>
                          <label htmlFor="register-privacy">He leído la política de privacidad.</label>{" "}
                          <button type="button" className="text-warning underline underline-offset-4 hover:text-warning/80"
                            onClick={() => setDocumentNotice("Política de privacidad")}>Consultar privacidad</button>
                        </div>
                      </div>
                    </div>
                    {documentNotice && (
                      <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
                        <p className="font-semibold text-warning">{documentNotice}: documento en preparación</p>
                        <p className="mt-1 text-white/80">Estamos trabajando en este documento. Estará disponible próximamente.</p>
                      </div>
                    )}
                  </>
                )}
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
                <div className="flex gap-3">
                {step === 2 && (
                  <Button
                    type="button"
                    className="h-10 flex-1 rounded-xl border border-white/20 bg-transparent text-sm text-white hover:bg-white/10"
                    isDisabled={isSubmitting}
                    onPress={() => {
                      setValidationError("");
                      resetRegistration();
                      setDocumentNotice("");
                      setStep(1);
                    }}
                  >
                    Volver atrás
                  </Button>
                )}
                {/* Desactivem l’enviament i mostrem un indicador mentre esperem la resposta. */}
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={isSubmitting}
                  className="h-10 flex-1 rounded-xl bg-warning text-sm font-semibold text-warning-foreground hover:bg-warning/90"
                >
                  {isSubmitting && <Spinner size="sm" color="current" aria-hidden="true" />}
                  {step === 1 ? "Continuar" : isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
                </Button>
                </div>
              </form>
            )}
          </div>
          {!registeredEmail && (
            <footer className="mt-4 flex flex-wrap justify-center gap-1 border-t border-white/15 pt-4 text-xs">
              <span className="text-white/65">¿Ya tienes una cuenta?</span>
              <Link to="/login" className="font-medium text-warning underline underline-offset-4 hover:text-warning/80">Inicia sesión</Link>
            </footer>
          )}
        </div>
      </div>
    </section>
  );
};

export default Register;
