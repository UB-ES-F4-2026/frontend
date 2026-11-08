import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Checkbox, Input, Label, ListBox, Select, Spinner, TextField } from "@heroui/react";
import { Link, useNavigate } from "react-router";
import { phoneCountries } from "./phoneCountries";
import registrationTeam from "../../assets/equip-thirdman.jpg";
import { useAuthStore } from "../../store/useAuthStore";

const Register = () => {
  const navigate = useNavigate();
  // Els dos passos comparteixen component i ruta; les dades es conserven en canviar de pas.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  // Camps controlats: React conserva els valors que introdueix l’usuari.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("ES");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);
  // La pàgina conserva les dades del formulari; el store gestiona la petició.
  const [validationError, setValidationError] = useState("");
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

    const country = phoneCountries.find((country) => country.code === phoneCountry);
    const compactPhone = phone.replace(/\s/g, "");
    let normalizedPhone = "";
    let phoneMessage = "";
    if (!country || !/^\+?[0-9]+$/.test(compactPhone)) {
      phoneMessage = "Introduce un número válido, solo con dígitos y espacios.";
    } else if (compactPhone.startsWith("+") && !compactPhone.startsWith(country.prefix)) {
      phoneMessage = "El prefijo del número debe coincidir con el país seleccionado.";
    } else {
      const nationalNumber = compactPhone.startsWith("+") ? compactPhone.slice(country.prefix.length) : compactPhone;
      normalizedPhone = `${country.prefix}${nationalNumber}`;
      if (!nationalNumber || !/^\+[1-9][0-9]{1,14}$/.test(normalizedPhone)) {
        phoneMessage = "Introduce un número válido de hasta 15 dígitos, incluido el prefijo.";
      } else if (country.code === "ES" && nationalNumber.length !== 9) {
        phoneMessage = "El número de España debe tener exactamente 9 dígitos sin el prefijo.";
      }
    }
    setPhoneError(phoneMessage);
    if (phoneMessage) {
      setStep(1);
      return;
    }

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
    const user = await register({ email, password, first_name: firstName.trim(), last_name: lastName.trim(), phone: normalizedPhone });
    // Només sortim del formulari quan el servidor confirma la creació del compte.
    if (user) navigate("/login", { replace: true });
  };

  return (
    <section style={{ overflowAnchor: "none" }} className="register-theme flex-1 bg-background text-foreground">
      <div className="mx-auto grid min-h-[calc(100svh-65px)] w-[min(1120px,calc(100%-48px))] gap-6 py-6 md:grid-cols-2 md:gap-[clamp(24px,5vw,80px)]">
        {/* El panell només es mostra des de md i s’adapta a l’alçada disponible. */}
        <div className="hidden md:block">
          <aside aria-labelledby="register-panel-title" className="register-panel sticky top-[89px] flex h-[calc(100svh-113px)] w-full flex-col overflow-hidden rounded-tr-[64px] bg-background text-foreground">
            <div className="shrink-0 p-[clamp(16px,3vw,32px)]">
              <p className="mb-3 text-[11px] uppercase tracking-widest text-foreground/85">Personas y posibilidades</p>
              <h2 id="register-panel-title" className="text-[clamp(24px,min(3.5vw,6vh),44px)] font-medium leading-[1.1] tracking-tight">
                Las grandes ideas empiezan <span className="block text-warning">contigo.</span>
              </h2>
            </div>
            <img src={registrationTeam} alt="" width="900" height="1350" className="min-h-0 w-full flex-1 object-cover object-center" />
          </aside>
        </div>
        <div className="w-full min-w-0 max-w-md self-center justify-self-center">
          <header className="mb-4 flex flex-col gap-3">
            <div>
              <ol aria-label="Pasos del registro" className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {["Datos personales", "Datos de acceso"].map((label, index) => (
                  <li key={label} aria-current={step === index + 1 ? "step" : undefined}
                    className={`flex items-center gap-1.5 ${step === index + 1 ? "font-semibold text-foreground" : "text-foreground/60"}`}>
                    <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${step === index + 1 ? "border-warning bg-warning text-warning-foreground" : "border-foreground/30"}`}>
                      {index + 1}
                    </span>
                    {label}
                  </li>
                ))}
              </ol>
              <p role="status" className="sr-only">Paso {step} de 2</p>
            </div>
            <h1 ref={headingRef} tabIndex={-1} className="outline-none text-3xl font-bold tracking-tight sm:text-4xl">Crear mi cuenta</h1>
            <p className="max-w-sm text-sm leading-snug text-foreground/65">
              {step === 1 ? "Comienza con tus datos personales. Todos los campos son obligatorios." : "Configura los datos de acceso a tu cuenta."}
            </p>
          </header>
          <div>
            <form onSubmit={handleSubmit} aria-label="Crear mi cuenta" aria-busy={isSubmitting} className="flex flex-col gap-3">
              {/* El navegador valida el camp obligatori i el format bàsic del correu. */}
              {step === 1 && (
                <>
                  <div className="grid min-w-0 grid-cols-1 gap-3">
                    {[
                      { name: "first_name", label: "Nombre", autoComplete: "given-name", placeholder: "Tu nombre", value: firstName, setValue: setFirstName },
                      { name: "last_name", label: "Apellidos", autoComplete: "family-name", placeholder: "Tus apellidos", value: lastName, setValue: setLastName },
                    ].map((field) => (
                      <TextField key={field.name} name={field.name} isRequired isDisabled={isSubmitting} className="min-w-0">
                        <Label className="text-sm font-medium text-foreground/90">{field.label}</Label>
                        <Input
                          className="h-10 w-full min-w-0 rounded-xl border border-foreground/15 bg-background px-4 text-foreground shadow-none placeholder:text-foreground/40 focus:border-warning focus:ring-2 focus:ring-warning/30"
                          name={field.name}
                          autoComplete={field.autoComplete}
                          placeholder={field.placeholder}
                          required
                          value={field.value}
                          onChange={(event) => field.setValue(event.target.value)}
                        />
                      </TextField>
                    ))}
                  </div>
                  <TextField name="email" type="email" isRequired isDisabled={isSubmitting}>
                    <Label className="text-sm font-medium text-foreground/90">Correo electrónico</Label>
                    <Input
                      className="h-10 rounded-xl border border-foreground/15 bg-background px-4 text-foreground shadow-none placeholder:text-foreground/40 focus:border-warning focus:ring-2 focus:ring-warning/30"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="nombre@ejemplo.com"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </TextField>
                  <fieldset className="min-w-0">
                    <legend className="sr-only">Número de teléfono</legend>
                    <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                      <Select name="phone_country" value={phoneCountry} onChange={(value) => {
                        setPhoneCountry(String(value));
                        setPhoneError("");
                      }}
                        isRequired isDisabled={isSubmitting} className="min-w-0">
                        <Label className="text-sm font-medium text-foreground/90">País y prefijo</Label>
                        <Select.Trigger className="h-10 min-h-10 w-full min-w-0 rounded-xl border border-foreground/15 bg-background px-3 text-foreground shadow-none focus-visible:outline-warning">
                          <Select.Value className="min-w-0 truncate" />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox aria-label="Países y prefijos">
                            {phoneCountries.map((country) => (
                              <ListBox.Item key={country.code} id={country.code} textValue={country.label}>
                                {country.label}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      <TextField name="phone" type="tel" isInvalid={Boolean(phoneError)} isRequired isDisabled={isSubmitting} className="min-w-0">
                        <Label className="text-sm font-medium text-foreground/90">Número</Label>
                        <Input
                          className="h-10 w-full min-w-0 rounded-xl border border-foreground/15 bg-background px-4 text-foreground shadow-none placeholder:text-foreground/40 focus:border-warning focus:ring-2 focus:ring-warning/30"
                          type="tel"
                          name="phone"
                          autoComplete="tel-national"
                          placeholder={phoneCountry === "ES" ? "612 345 678" : "Número sin prefijo"}
                          required
                          aria-describedby={phoneError ? "register-phone-help register-phone-error" : "register-phone-help"}
                          aria-invalid={Boolean(phoneError)}
                          value={phone}
                          onChange={(event) => {
                            setPhone(event.target.value);
                            setPhoneError("");
                          }}
                        />
                      </TextField>
                    </div>
                    {phoneError && <p id="register-phone-error" role="alert" className="mt-2 text-xs text-danger">{phoneError}</p>}
                    <p id="register-phone-help" className="mt-2 text-xs leading-relaxed text-foreground/65">
                      Introduce el número sin el prefijo internacional.
                    </p>
                  </fieldset>
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
                      <Label className="text-sm font-medium text-foreground/90">{field.label}</Label>
                      <div className="relative">
                        <Input
                          className="h-10 w-full rounded-xl border border-foreground/15 bg-background py-0 pl-4 pr-12 text-foreground shadow-none placeholder:text-foreground/40 focus:border-warning focus:ring-2 focus:ring-warning/30"
                          type={field.visible ? "text" : "password"}
                          name={field.name}
                          autoComplete="new-password"
                          required
                          aria-describedby={field.name === "password" ? "register-password-help" : undefined}
                          value={field.value}
                          onChange={(event) => field.setValue(event.target.value)}
                        />
                        <Button
                          isIconOnly
                          variant="ghost"
                          type="button"
                          isDisabled={isSubmitting}
                          aria-label={`${field.visible ? "Ocultar" : "Mostrar"} ${field.name === "password" ? "contraseña" : "confirmación de contraseña"}`}
                          className="absolute inset-y-0 right-0 flex h-10 min-w-10 w-10 items-center justify-center rounded-r-xl bg-transparent p-0 text-foreground/65 focus-visible:outline-2 focus-visible:outline-warning disabled:opacity-50"
                          onPress={() => field.setVisible(!field.visible)}
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                            <circle cx="12" cy="12" r="3" />
                            {field.visible && <path d="m3 3 18 18" />}
                          </svg>
                        </Button>
                      </div>
                      {field.name === "password" && (
                        <p id="register-password-help" className="text-xs leading-relaxed text-foreground/65">
                          La contraseña debe tener entre 8 y 72 caracteres.
                        </p>
                      )}
                    </TextField>
                  ))}
                  {/* Els documents s’obren en una altra pestanya per conservar les dades del formulari. */}
                  <div className="space-y-2 text-xs leading-relaxed text-foreground/80">
                    {[
                      { name: "terms", label: "Acepto las condiciones de uso.", selected: acceptedTerms, setSelected: setAcceptedTerms, path: "condiciones-de-uso", link: "Consultar condiciones" },
                      { name: "privacy", label: "He leído la política de privacidad.", selected: readPrivacy, setSelected: setReadPrivacy, path: "politica-de-privacidad", link: "Consultar privacidad" },
                    ].map((document) => (
                      <div key={document.name} className="flex flex-wrap items-center gap-x-2">
                        <Checkbox name={document.name} isRequired isDisabled={isSubmitting}
                          isSelected={document.selected} onChange={document.setSelected}>
                          <Checkbox.Content className="gap-3">
                            <Checkbox.Control className="size-4 shrink-0 border border-foreground/40">
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Label className="text-xs text-foreground/80">{document.label}</Label>
                          </Checkbox.Content>
                        </Checkbox>
                        <a href={`/legal/${document.path}`} target="_blank" rel="noopener noreferrer"
                          aria-label={`${document.link} (se abre en una pestaña nueva)`}
                          className="ml-7 text-warning lg:ml-0 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-warning">
                          {document.link}<span className="sr-only"> (se abre en una pestaña nueva)</span>
                        </a>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-foreground/65">Documentos en borrador, pendientes de revisión.</p>
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
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 min-h-10 w-full rounded-xl sm:flex-1 border border-foreground/20 bg-background text-sm text-foreground"
                  isDisabled={isSubmitting}
                  onPress={() => {
                    setValidationError("");
                    resetRegistration();
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
                className="h-10 min-h-10 w-full rounded-xl sm:flex-1 bg-warning text-sm font-semibold text-warning-foreground"
              >
                {isSubmitting && <Spinner size="sm" color="current" aria-hidden="true" />}
                {step === 1 ? "Continuar" : isSubmitting ? "Creando cuenta…" : "Crear cuenta"}
              </Button>
              </div>
            </form>
          </div>
          <footer className="mt-4 flex flex-wrap justify-center gap-1 border-t border-foreground/15 pt-4 text-xs">
            <span className="text-foreground/65">¿Ya tienes una cuenta?</span>
            <Link to="/login" className="font-medium text-warning underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-warning">Inicia sesión</Link>
          </footer>
        </div>
      </div>
    </section>
  );
};

export default Register;
