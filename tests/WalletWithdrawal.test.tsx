import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyWalletPage from "../src/pages/wallet/MyWalletPage";
import WalletWithdrawalPage from "../src/pages/wallet/WalletWithdrawalPage";
import { ApiError, fintechGet, fintechPost } from "../src/service/api";
import { useAuthStore } from "../src/store/useAuthStore";
import { useWalletStore } from "../src/store/useWalletStore";

// Pàgines i stores reals; només simulem les crides a l'API.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
  fintechPost: vi.fn(),
}));

const get = vi.mocked(fintechGet);
const post = vi.mocked(fintechPost);
const account = { id: 1, email: "user@example.com", created_at: "2026-10-27T10:00:00Z" };

// Intl separa l'import i el símbol amb un espai no separable (U+00A0). El text visible
// (getByText, toHaveTextContent) el normalitza a un espai; la descripció accessible, no.
const eur = (text: string) => text.replace(/ €/g, " €");

// IBAN de la maqueta (vàlid) i el cos que rep el backend.
const IBAN = "ES91 2100 0418 4502 0005 1332";
const HOLDER = "Ana García López";

// Backend simulat: saldo del client. Una retirada correcta el descompta.
let server: { available: number; committed: number };

function CurrentPath() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/my-balance" element={<MyWalletPage />} />
        <Route path="/my-balance/withdraw" element={<WalletWithdrawalPage />} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );

const user = () => userEvent.setup({ delay: null });
const amountField = () => screen.getByRole("textbox", { name: /Importe a retirar/ });
const ibanField = () => screen.getByRole("textbox", { name: /IBAN de destino/ });
const holderField = () => screen.getByRole("textbox", { name: /Titular de la cuenta/ });
const continueButton = () => screen.getByRole("button", { name: "Continuar" });
const confirmButton = () => screen.getByRole("button", { name: "Confirmar retirada" });
const currentPath = () => screen.getByLabelText("Ruta actual");
// Valor que acompanya cada etiqueta del resum de confirmació.
const summaryValue = (label: string) => screen.getByText(label, { selector: "dt" }).nextElementSibling;

// Obre la pantalla directament i espera el formulari (necessita el saldo).
const openForm = async () => {
  renderAt("/my-balance/withdraw");
  await screen.findByRole("form", { name: "Datos de la retirada" });
};

// Omple el primer pas; un valor buit deixa el camp sense tocar.
const fill = async (u: ReturnType<typeof user>, { amount = "100", iban = IBAN, holder = HOLDER } = {}) => {
  if (amount) await u.type(amountField(), amount);
  if (iban) await u.type(ibanField(), iban);
  if (holder) await u.type(holderField(), holder);
};

// Omple dades vàlides i passa a la confirmació.
const goToConfirmation = async (u: ReturnType<typeof user>, data?: Parameters<typeof fill>[1]) => {
  await fill(u, data);
  await u.click(continueButton());
  await screen.findByRole("heading", { name: "Confirma la retirada" });
};

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState({ ...useAuthStore.getInitialState(), active_account: account }, true);
  useWalletStore.getState().reset();

  // 250,00 € disponibles i 50,00 € compromesos: el compromès no es pot retirar.
  server = { available: 25000, committed: 5000 };
  get.mockImplementation(async (path) => {
    if (path !== "/me/wallet") throw new Error(`Ruta inesperada: ${path}`);
    return { available_cents: server.available, committed_cents: server.committed, currency: "eur" };
  });
  post.mockImplementation(async (path, body) => {
    if (path !== "/me/wallet/withdrawals") throw new Error(`Ruta inesperada: ${path}`);
    const { amount_cents, iban, account_holder } = body as { amount_cents: number; iban: string; account_holder: string };
    if (amount_cents > server.available) throw new ApiError("Insufficient available balance", 409, null);
    server.available -= amount_cents;
    return {
      amount_cents,
      masked_iban: `${iban.slice(0, 4)}${"*".repeat(iban.length - 8)}${iban.slice(-4)}`,
      account_holder,
      available_cents: server.available,
      currency: "eur",
    };
  });
});

describe("1. Accés a la pantalla de retirada", () => {
  it("«Retirar fondos» de «Mi saldo» obre la pantalla amb els tres camps, el saldo disponible i l'avís de simulació", async () => {
    const u = user();
    renderAt("/my-balance");
    await screen.findByText("250,00 €");
    await u.click(screen.getByRole("link", { name: "Retirar fondos" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Retirar fondos" })).toBeInTheDocument();
    expect(currentPath()).toHaveTextContent("/my-balance/withdraw");
    expect(screen.getByText("El importe se transferirá a la cuenta bancaria que indiques.")).toBeInTheDocument();
    expect(screen.getByText("Entorno de simulación: no se realizará ninguna transferencia real.")).toBeInTheDocument();

    expect(await screen.findByRole("textbox", { name: /Importe a retirar \(€\)/ })).toHaveValue("");
    expect(ibanField()).toHaveValue("");
    expect(holderField()).toHaveValue("");
    expect(amountField()).toHaveAccessibleDescription(eur("Saldo disponible: 250,00 €"));
    expect(screen.getByRole("button", { name: "Retirar todo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a mi saldo" })).toHaveAttribute("href", "/my-balance");
  });

  it("mentre llegeix el saldo no mostra el formulari", () => {
    get.mockReturnValue(new Promise(() => {}));
    renderAt("/my-balance/withdraw");
    expect(screen.getByText("Cargando saldo…")).toHaveAttribute("role", "status");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("si no pot llegir el saldo ho indica i «Reintentar» el torna a consultar", async () => {
    const u = user();
    get.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderAt("/my-balance/withdraw");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se ha podido consultar tu saldo");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();

    await u.click(within(alert).getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("form", { name: "Datos de la retirada" })).toBeInTheDocument();
  });
});

describe("2. Sense saldo disponible", () => {
  it("amb 0,00 € disponibles «Retirar fondos» apareix desactivat amb el motiu", async () => {
    server.available = 0;
    renderAt("/my-balance");
    await screen.findByText("Tu saldo disponible es de 0,00 €");

    const button = screen.getByRole("button", { name: "Retirar fondos" });
    expect(button).toBeDisabled();
    expect(button).toHaveAccessibleDescription("No tienes saldo disponible para retirar.");
    expect(screen.getByText("No tienes saldo disponible para retirar.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Retirar fondos" })).not.toBeInTheDocument();
  });

  it("el saldo compromès no compta: amb 0,00 € disponibles no es pot retirar encara que n'hi hagi", async () => {
    server = { available: 0, committed: 10000 };
    renderAt("/my-balance");
    await screen.findByText("Tu saldo disponible es de 0,00 €");
    expect(screen.getByRole("button", { name: "Retirar fondos" })).toBeDisabled();
  });

  it("mentre llegeix el saldo el botó està desactivat però no diu que no n'hi hagi", () => {
    get.mockReturnValue(new Promise(() => {}));
    renderAt("/my-balance");
    expect(screen.getByRole("button", { name: "Retirar fondos" })).toBeDisabled();
    expect(screen.queryByText("No tienes saldo disponible para retirar.")).not.toBeInTheDocument();
  });

  it("si s'obre la pantalla sense saldo, no mostra el formulari", async () => {
    server.available = 0;
    renderAt("/my-balance/withdraw");
    expect(await screen.findByText("No tienes saldo disponible para retirar.")).toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
});

describe("3. Retirar tot el saldo", () => {
  it("«Retirar todo» omple l'import amb els 250,00 € disponibles", async () => {
    const u = user();
    await openForm();
    await u.click(screen.getByRole("button", { name: "Retirar todo" }));
    expect(amountField()).toHaveValue("250,00");
  });

  it("substitueix l'import escrit i n'esborra l'error", async () => {
    const u = user();
    await openForm();
    await u.type(amountField(), "300");
    await u.click(continueButton());
    expect(screen.getByText("El importe supera tu saldo disponible.")).toBeInTheDocument();

    await u.click(screen.getByRole("button", { name: "Retirar todo" }));
    expect(amountField()).toHaveValue("250,00");
    expect(screen.queryByText("El importe supera tu saldo disponible.")).not.toBeInTheDocument();
  });

  it("no envia el formulari", async () => {
    const u = user();
    await openForm();
    await u.click(screen.getByRole("button", { name: "Retirar todo" }));
    expect(screen.queryByRole("heading", { name: "Confirma la retirada" })).not.toBeInTheDocument();
    expect(screen.queryByText("Introduce un IBAN válido.")).not.toBeInTheDocument();
  });
});

describe("4. Validació de les dades", () => {
  it.each([
    ["un import inferior a 0,50 €", { amount: "0,20" }, amountField, "La retirada mínima es de 0,50 €."],
    ["un import amb més de dos decimals", { amount: "10,555" }, amountField, "Introduce un importe válido con hasta dos decimales."],
    ["un import superior al saldo disponible", { amount: "250,01" }, amountField, "El importe supera tu saldo disponible."],
    ["sense import", { amount: "" }, amountField, "Introduce el importe a retirar."],
    ["un IBAN no vàlid", { iban: "ES12 3456" }, ibanField, "Introduce un IBAN válido."],
    ["un IBAN amb els dígits de control incorrectes", { iban: "ES91 2100 0418 4502 0005 1333" }, ibanField, "Introduce un IBAN válido."],
    ["sense IBAN", { iban: "" }, ibanField, "Introduce el IBAN de destino."],
    ["sense titular", { holder: "" }, holderField, "Introduce el titular de la cuenta."],
    ["un titular amb xifres i símbols", { holder: '19301·!"=·!)"·=!$()' }, holderField, "Usa solo letras, espacios, puntos, comas, apóstrofos y guiones."],
  ])("amb %s no passa a la confirmació i mostra l'error sota el camp", async (_label, data, field, message) => {
    const u = user();
    await openForm();
    await fill(u, data);
    await u.click(continueButton());

    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(field()).toHaveAccessibleDescription(expect.stringContaining(eur(message)));
    expect(screen.getAllByText(message)).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "Confirma la retirada" })).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("un titular només amb espais no és vàlid", async () => {
    const u = user();
    await openForm();
    await fill(u, { holder: "   " });
    await u.click(continueButton());
    expect(holderField()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Introduce el titular de la cuenta.")).toBeInTheDocument();
  });

  it("amb diversos errors (maqueta) els mostra tots alhora i porta el focus al primer", async () => {
    const u = user();
    await openForm();
    await fill(u, { amount: "300", iban: "ES12 3456", holder: "" });
    await u.click(continueButton());

    expect(amountField()).toHaveAccessibleDescription(expect.stringContaining("El importe supera tu saldo disponible."));
    expect(ibanField()).toHaveAccessibleDescription("Introduce un IBAN válido.");
    expect(holderField()).toHaveAccessibleDescription("Introduce el titular de la cuenta.");
    expect(amountField()).toHaveFocus();
  });

  it("l'error d'un camp desapareix en tornar-hi a escriure, sense esborrar els altres", async () => {
    const u = user();
    await openForm();
    await fill(u, { amount: "", iban: "ES12", holder: "" });
    await u.click(continueButton());
    expect(screen.getByText("Introduce un IBAN válido.")).toBeInTheDocument();

    await u.type(ibanField(), "3");
    expect(screen.queryByText("Introduce un IBAN válido.")).not.toBeInTheDocument();
    expect(ibanField()).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText("Introduce el importe a retirar.")).toBeInTheDocument();
    expect(screen.getByText("Introduce el titular de la cuenta.")).toBeInTheDocument();
  });

  it("accepta l'IBAN en minúscules i sense espais, i el mostra en grups de quatre", async () => {
    const u = user();
    await openForm();
    await u.type(ibanField(), "es9121000418450200051332");
    await u.tab();
    expect(ibanField()).toHaveValue(IBAN);
  });

  it("dona format a l'import com la resta de xifres", async () => {
    const u = user();
    await openForm();
    await u.type(amountField(), "100,5");
    await u.tab();
    expect(amountField()).toHaveValue("100,50");
  });
});

describe("5. Confirmació de la retirada", () => {
  it("mostra l'import, l'IBAN amb només els primers i els últims dígits, el titular i el saldo que quedarà", async () => {
    const u = user();
    await openForm();
    await goToConfirmation(u);

    expect(screen.getByRole("heading", { name: "Confirma la retirada" })).toHaveFocus();
    expect(summaryValue("Importe a retirar")).toHaveTextContent("100,00 €");
    expect(summaryValue("IBAN de destino")).toHaveTextContent("ES91 •••• •••• •••• •••• 1332");
    expect(summaryValue("Titular de la cuenta")).toHaveTextContent(HOLDER);
    expect(summaryValue("Saldo disponible tras la retirada")).toHaveTextContent("150,00 €");

    // L'IBAN complet no apareix enlloc, i el lector de pantalla no llegeix els punts.
    expect(screen.queryByText(/2100|0418|4502|0005/)).not.toBeInTheDocument();
    expect(within(summaryValue("IBAN de destino") as HTMLElement).getByText("ES91, terminado en 1332")).toHaveClass("sr-only");
    // Encara no s'ha retirat res.
    expect(post).not.toHaveBeenCalled();
  });

  it("«Volver» torna al primer pas amb les dades conservades", async () => {
    const u = user();
    await openForm();
    await goToConfirmation(u, { amount: "100,5", iban: "es9121000418450200051332", holder: "  Ana   García López " });
    await u.click(screen.getByRole("button", { name: "Volver" }));

    expect(amountField()).toHaveValue("100,50");
    expect(amountField()).toHaveFocus();
    expect(ibanField()).toHaveValue(IBAN);
    expect(holderField()).toHaveValue(HOLDER);
    expect(post).not.toHaveBeenCalled();

    // Es pot tornar a continuar amb les mateixes dades.
    await u.click(continueButton());
    expect(await screen.findByRole("heading", { name: "Confirma la retirada" })).toBeInTheDocument();
  });
});

describe("6. Retirada correcta", () => {
  it("amb 250,00 € i una retirada de 100,00 € torna a «Mi saldo» amb «Retirada realizada» i 150,00 € disponibles", async () => {
    const u = user();
    renderAt("/my-balance");
    await screen.findByText("250,00 €");
    await u.click(screen.getByRole("link", { name: "Retirar fondos" }));
    await screen.findByRole("form", { name: "Datos de la retirada" });
    await goToConfirmation(u);
    await u.click(confirmButton());

    // L'IBAN i el titular van normalitzats, com els valida el backend.
    expect(post).toHaveBeenCalledExactlyOnceWith("/me/wallet/withdrawals", {
      amount_cents: 10000,
      iban: "ES9121000418450200051332",
      account_holder: HOLDER,
    });
    const notice = await screen.findByText("Retirada realizada");
    expect(currentPath()).toHaveTextContent(/^\/my-balance$/);
    expect(notice.closest("[role=status]")).toHaveTextContent("Se han retirado 100,00 € de tu saldo disponible.");
    const balance = screen.getByRole("region", { name: "Saldo disponible" });
    expect(await within(balance).findByText("150,00 €")).toBeInTheDocument();
  });

  it("es pot retirar tot el saldo disponible", async () => {
    const u = user();
    await openForm();
    await u.click(screen.getByRole("button", { name: "Retirar todo" }));
    await goToConfirmation(u, { amount: "" });
    expect(summaryValue("Saldo disponible tras la retirada")).toHaveTextContent("0,00 €");
    await u.click(confirmButton());

    expect(await screen.findByText("Retirada realizada")).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/me/wallet/withdrawals", expect.objectContaining({ amount_cents: 25000 }));
    expect(await screen.findByText("Tu saldo disponible es de 0,00 €")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirar fondos" })).toBeDisabled();
  });

  it("bloqueja «Confirmar retirada» i «Volver» mentre es processa i no retira dues vegades", async () => {
    const u = user();
    let finish!: (value: unknown) => void;
    post.mockReturnValueOnce(new Promise((done) => { finish = done; }));
    await openForm();
    await goToConfirmation(u);
    await u.click(confirmButton());

    const processing = screen.getByRole("button", { name: "Procesando…" });
    expect(processing).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();
    await u.click(processing);
    expect(post).toHaveBeenCalledOnce();

    finish({ amount_cents: 10000, masked_iban: "ES91****************1332", account_holder: HOLDER, available_cents: 15000 });
    expect(await screen.findByText("Retirada realizada")).toBeInTheDocument();
  });

  it("l'avís només es mostra una vegada: en tornar a entrar ja no hi és", async () => {
    useWalletStore.setState({ lastWithdrawal: { amount_cents: 10000 } });
    const { unmount } = renderAt("/my-balance");
    expect(screen.getByText("Retirada realizada")).toBeInTheDocument();
    await screen.findByText("250,00 €");
    unmount();

    renderAt("/my-balance");
    await screen.findByText("250,00 €");
    expect(screen.queryByText("Retirada realizada")).not.toBeInTheDocument();
  });
});

describe("Errors en confirmar la retirada", () => {
  it("si el saldo ha baixat mentrestant (409) ho indica, no surt de la confirmació i el primer pas mostra el saldo actual", async () => {
    const u = user();
    await openForm();
    await goToConfirmation(u);
    // Una aportació des d'una altra pestanya deixa 50,00 € disponibles.
    server.available = 5000;
    await u.click(confirmButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tu saldo disponible ya no cubre este importe. Vuelve atrás y revisa el importe.",
    );
    expect(currentPath()).toHaveTextContent("/my-balance/withdraw");
    expect(confirmButton()).toBeEnabled();

    await u.click(screen.getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(amountField()).toHaveAccessibleDescription(eur("Saldo disponible: 50,00 €")));
    expect(amountField()).toHaveValue("100,00");
  });

  it.each([
    ["dades rebutjades pel backend (422)", new ApiError("HTTP Error 422", 422, { detail: [] }), "Los datos de la retirada no son válidos. Vuelve atrás y revísalos."],
    ["un error del servidor", new ApiError("Server error", 500, null), "No se ha podido realizar la retirada. Inténtalo de nuevo."],
    ["un error de xarxa", new TypeError("Failed to fetch"), "No se ha podido realizar la retirada. Inténtalo de nuevo."],
  ])("davant %s mostra un missatge i permet tornar-ho a provar", async (_label, error, message) => {
    const u = user();
    post.mockRejectedValueOnce(error);
    await openForm();
    await goToConfirmation(u);
    await u.click(confirmButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(server.available).toBe(25000);

    await u.click(confirmButton());
    expect(await screen.findByText("Retirada realizada")).toBeInTheDocument();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("amb la sessió caducada (401) no mostra cap missatge: SessionManager porta al login", async () => {
    const u = user();
    post.mockRejectedValueOnce(new ApiError("Invalid or missing session", 401, null));
    await openForm();
    await goToConfirmation(u);
    await u.click(confirmButton());
    await waitFor(() => expect(confirmButton()).toBeEnabled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("en tornar enrere i continuar, l'error anterior ja no hi és", async () => {
    const u = user();
    post.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await openForm();
    await goToConfirmation(u);
    await u.click(confirmButton());
    await screen.findByRole("alert");

    await u.click(screen.getByRole("button", { name: "Volver" }));
    await u.click(continueButton());
    await screen.findByRole("heading", { name: "Confirma la retirada" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("7. Cancel·lar", () => {
  it("«Cancelar» torna a «Mi saldo» sense retirar res", async () => {
    const u = user();
    await openForm();
    await fill(u);
    await u.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(currentPath()).toHaveTextContent(/^\/my-balance$/);
    expect(await screen.findByText("250,00 €")).toBeInTheDocument();
    expect(screen.queryByText("Retirada realizada")).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("«Volver a mi saldo» torna a «Mi saldo» sense retirar res", async () => {
    const u = user();
    await openForm();
    await fill(u);
    await u.click(screen.getByRole("link", { name: "Volver a mi saldo" }));

    expect(currentPath()).toHaveTextContent(/^\/my-balance$/);
    expect(await screen.findByText("250,00 €")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("en sortir de la pantalla descarta el saldo llegit, però no la retirada que ha d'anunciar «Mi saldo»", async () => {
    useWalletStore.setState({ lastWithdrawal: { amount_cents: 10000 } });
    const { unmount } = renderAt("/my-balance/withdraw");
    await screen.findByRole("form", { name: "Datos de la retirada" });
    unmount();
    expect(useWalletStore.getState()).toMatchObject({
      status: "idle",
      balance: null,
      withdrawalStatus: "idle",
      lastWithdrawal: { amount_cents: 10000 },
    });
  });
});
