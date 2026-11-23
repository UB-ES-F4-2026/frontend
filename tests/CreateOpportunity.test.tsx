import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MyOpportunitiesPage from "../src/pages/my-opportunities/MyOpportunitiesPage";
import CreateOpportunityPage from "../src/pages/my-opportunities/create/CreateOpportunityPage";
import { ApiError, fintechGet, fintechPost } from "../src/service/api";
import { useOpportunityStore } from "../src/store/useOpportunityStore";
import { useWalletStore } from "../src/store/useWalletStore";
import { clickMap } from "./support/reactLeaflet";

// Pàgines i stores reals; només simulem les crides a l'API.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
  fintechPost: vi.fn(),
}));

vi.mock("react-leaflet", async () => (await import("./support/reactLeaflet")).reactLeafletMock);

const get = vi.mocked(fintechGet);
const post = vi.mocked(fintechPost);

// Intl separa l'import i el símbol amb un espai no separable (U+00A0). Les consultes per text el
// normalitzen a un espai normal, però la descripció accessible el conserva.
const eur = (text: string) => text.replace(/ €/g, "\u00a0€");

const FUTURE_DEADLINE = "2099-01-31T23:59";

let availableCents: number;

function CurrentPath() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/my-opportunities" element={<MyOpportunitiesPage />} />
        <Route path="/my-opportunities/new/real-estate" element={<CreateOpportunityPage type="real_estate" />} />
        <Route path="/my-opportunities/new/equity" element={<CreateOpportunityPage type="equity" />} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );

const user = () => userEvent.setup({ delay: null });
type User = ReturnType<typeof user>;

const image = (name: string, type = "image/png", size = 1024) => {
  const file = new File(["imatge"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

const path = () => screen.getByLabelText("Ruta actual");
const stepHeading = () => screen.getByRole("heading", { level: 2 });
const currentStep = () =>
  within(screen.getByRole("list", { name: "Pasos" }))
    .getAllByRole("listitem")
    .find((item) => item.getAttribute("aria-current") === "step");
const continueButton = () => screen.getByRole("button", { name: "Continuar" });
const imageInput = () => screen.getByLabelText("Añadir imágenes");
const targetField = () => screen.getByLabelText(/Objetivo de financiación/);
const minimumField = () => screen.getByLabelText(/Aportación mínima/);
const deadlineField = () => screen.getByLabelText("Fecha límite de financiación");
const initialField = () => screen.getByLabelText(/Tu aportación inicial/);

const fillGeneral = async (u: User, cover = image("portada.png")) => {
  await u.type(screen.getByLabelText("Título"), "Local comercial en Sabadell");
  await u.type(screen.getByLabelText("Descripción"), "Adquisición y reforma de un local.");
  await u.type(screen.getByLabelText("Municipio"), "Sabadell");
  await u.type(screen.getByLabelText("Provincia"), "Barcelona");
  await u.type(screen.getByLabelText("País"), "España");
  await u.upload(imageInput(), cover);
};

const choose = async (u: User, field: RegExp, option: string) => {
  await u.click(screen.getByRole("button", { name: field }));
  await u.click(screen.getByRole("option", { name: option }));
};

// Les dades de l'immoble del mockup: sense viviendas previstas (Comercial).
const fillRealEstate = async (u: User) => {
  await choose(u, /Finalidad/, "Adquisición y rehabilitación");
  await choose(u, /Uso previsto/, "Alquiler");
  await choose(u, /Tipo de activo/, "Comercial");
  await u.type(screen.getByLabelText("Superficie (m²)"), "180");
};

const REAL_ESTATE_PAYLOAD = {
  purpose: "acquisition_and_renovation",
  intended_use: "rental",
  asset_type: "commercial",
  surface_m2: "180.00",
  planned_housing_units: null,
  estimated_works_end: null,
  estimated_rental_start: null,
  public_latitude: null,
  public_longitude: null,
};

const fillFunding = async (u: User, { initial = "" } = {}) => {
  await screen.findByText("8.000,00 €");
  await u.type(targetField(), "150000");
  await u.type(minimumField(), "100");
  fireEvent.change(deadlineField(), { target: { value: FUTURE_DEADLINE } });
  if (initial) await u.type(initialField(), initial);
};

// Omple els passos fins a «Financiación».
const goToFunding = async (u: User) => {
  await fillGeneral(u);
  await u.click(continueButton());
  await fillRealEstate(u);
  await u.click(continueButton());
  expect(stepHeading()).toHaveTextContent("Financiación");
};

const goToReview = async (u: User, options?: { initial?: string }) => {
  await goToFunding(u);
  await fillFunding(u, options);
  await u.click(continueButton());
  expect(stepHeading()).toHaveTextContent("Revisión");
};

beforeEach(() => {
  vi.resetAllMocks();
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  useWalletStore.getState().reset();
  availableCents = 800_000;
  get.mockImplementation(async (url: string) => {
    if (url === "/me/wallet") return { available_cents: availableCents, committed_cents: 0, currency: "eur" };
    throw new Error(`Petició inesperada: ${url}`);
  });
  // jsdom no crea adreces temporals per a les vistes prèvies.
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: vi.fn(() => "blob:vista-previa") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: vi.fn() });
});

describe("Mis oportunidades: iniciar la creació", () => {
  it("«Crear oportunidad» pregunta el tipus i «Inmobiliaria» obre el formulari al primer pas", async () => {
    const u = user();
    renderAt("/my-opportunities");

    await u.click(screen.getByRole("button", { name: "Crear oportunidad" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "¿Qué tipo de oportunidad quieres crear?" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Empresarial/ })).toBeInTheDocument();

    await u.click(within(dialog).getByRole("link", { name: /Inmobiliaria/ }));

    expect(path()).toHaveTextContent(/^\/my-opportunities\/new\/real-estate$/);
    expect(screen.getByRole("heading", { level: 1, name: "Nueva oportunidad inmobiliaria" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Pasos" })).getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["1Información general", "2Inmueble", "3Financiación", "4Revisión"]);
    expect(currentStep()).toHaveTextContent("Información general");
    expect(stepHeading()).toHaveTextContent("Información general");
  });

  it("«Empresarial» obre «Nueva oportunidad empresarial» amb el pas «Empresa»", async () => {
    const u = user();
    renderAt("/my-opportunities");

    await u.click(screen.getByRole("button", { name: "Crear oportunidad" }));
    await u.click(within(screen.getByRole("dialog")).getByRole("link", { name: /Empresarial/ }));

    expect(path()).toHaveTextContent(/^\/my-opportunities\/new\/equity$/);
    expect(screen.getByRole("heading", { level: 1, name: "Nueva oportunidad empresarial" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Pasos" })).toHaveTextContent("Empresa");
  });
});

describe("pas «Información general»", () => {
  it("no continua si falten dades i mostra l'error sota cada camp", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");

    await u.click(continueButton());

    expect(stepHeading()).toHaveTextContent("Información general");
    expect(screen.getByLabelText("Título")).toHaveAccessibleDescription("Introduce el título.");
    expect(screen.getByLabelText("Descripción")).toHaveAccessibleDescription(expect.stringContaining("Introduce la descripción."));
    expect(screen.getByLabelText("Municipio")).toHaveAccessibleDescription("Introduce el municipio.");
    expect(screen.getByLabelText("Provincia")).toHaveAccessibleDescription("Introduce la provincia.");
    expect(screen.getByLabelText("País")).toHaveAccessibleDescription("Introduce el país.");
    expect(imageInput()).toHaveAccessibleDescription(expect.stringContaining("Añade al menos una imagen."));
  });

  it("una ubicació només amb espais no és vàlida", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");

    await u.type(screen.getByLabelText("Municipio"), "   ");
    await u.click(continueButton());

    expect(screen.getByLabelText("Municipio")).toHaveAccessibleDescription("Introduce el municipio.");
  });

  it("descarta les imatges que no són JPG, PNG o WebP o que superen els 5 MB", async () => {
    const u = userEvent.setup({ delay: null, applyAccept: false });
    renderAt("/my-opportunities/new/real-estate");

    await u.upload(imageInput(), [image("animacio.gif", "image/gif"), image("gran.png", "image/png", 5 * 1024 * 1024 + 1)]);

    expect(screen.getByText("«animacio.gif» no es una imagen JPG, PNG o WebP.")).toBeInTheDocument();
    expect(screen.getByText("«gran.png» supera los 5 MB.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("accepta imatges de fins a 5 MB; la primera és la portada i en eliminar-la passa a ser-ho la següent", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");

    await u.upload(imageInput(), [
      image("primera.jpg", "image/jpeg", 5 * 1024 * 1024),
      image("segona.webp", "image/webp"),
    ]);

    const thumbnails = () => screen.getAllByRole("img");
    expect(thumbnails().map((img) => img.getAttribute("alt"))).toEqual(["primera.jpg", "segona.webp"]);
    expect(screen.getAllByText("Portada")).toHaveLength(1);
    expect(thumbnails()[0].parentElement).toHaveTextContent("Portada");

    await u.click(screen.getByRole("button", { name: "Eliminar primera.jpg" }));

    expect(thumbnails().map((img) => img.getAttribute("alt"))).toEqual(["segona.webp"]);
    expect(thumbnails()[0].parentElement).toHaveTextContent("Portada");
  });

  it("amb totes les dades passa al pas propi del tipus", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");

    await fillGeneral(u);
    await u.click(continueButton());

    expect(stepHeading()).toHaveTextContent("Inmueble");
    expect(currentStep()).toHaveTextContent("Inmueble");
    expect(screen.getByRole("list", { name: "Pasos" })).toHaveTextContent("Información general(completado)");
  });
});

describe("pas «Inmueble»", () => {
  const goToRealEstate = async (u: User) => {
    renderAt("/my-opportunities/new/real-estate");
    await fillGeneral(u);
    await u.click(continueButton());
    expect(stepHeading()).toHaveTextContent("Inmueble");
  };

  it("no continua sense finalitat, ús previst, tipus d'actiu ni superfície", async () => {
    const u = user();
    await goToRealEstate(u);

    await u.click(continueButton());

    expect(stepHeading()).toHaveTextContent("Inmueble");
    expect(screen.getByText("Selecciona la finalidad.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona el uso previsto.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona el tipo de activo.")).toBeInTheDocument();
    expect(screen.getByLabelText("Superficie (m²)")).toHaveAccessibleDescription("Introduce la superficie.");
  });

  it("amb un tipus Residencial exigeix les viviendas previstas", async () => {
    const u = user();
    await goToRealEstate(u);
    await choose(u, /Finalidad/, "Construcción");
    await choose(u, /Uso previsto/, "Venta");
    await choose(u, /Tipo de activo/, "Residencial");
    await u.type(screen.getByLabelText("Superficie (m²)"), "900");

    await u.click(continueButton());

    expect(stepHeading()).toHaveTextContent("Inmueble");
    expect(screen.getByLabelText("Viviendas previstas")).toHaveAccessibleDescription(
      "Introduce el número de viviendas previstas.",
    );
    await u.type(screen.getByLabelText("Viviendas previstas"), "12");
    await u.click(continueButton());
    expect(stepHeading()).toHaveTextContent("Financiación");
  });

  it("envia les dades de l'immoble, els camps condicionals i la ubicació aproximada", async () => {
    const u = user();
    await goToRealEstate(u);
    await choose(u, /Finalidad/, "Construcción");
    await choose(u, /Uso previsto/, "Alquiler");
    await choose(u, /Tipo de activo/, "Mixto");
    await u.type(screen.getByLabelText("Superficie (m²)"), "1.250,5");
    await u.type(screen.getByLabelText("Viviendas previstas"), "12");
    fireEvent.change(screen.getByLabelText(/Finalización estimada de las obras/), { target: { value: "2027-06-30" } });
    fireEvent.change(screen.getByLabelText(/Inicio estimado del alquiler/), { target: { value: "2027-09-01" } });
    act(() => clickMap(41.3879171, 2.1699187));
    await u.click(continueButton());
    await fillFunding(u);
    await u.click(continueButton());

    const realEstate = screen.getByRole("region", { name: "Inmueble" });
    expect(realEstate).toHaveTextContent("Construcción · Alquiler · Mixto");
    expect(realEstate).toHaveTextContent("Superficie1.250,5 m²");
    expect(realEstate).toHaveTextContent("Viviendas previstas12");
    expect(realEstate).toHaveTextContent("Finalización estimada de las obras30 de junio de 2027");
    expect(realEstate).toHaveTextContent("Inicio estimado del alquiler1 de septiembre de 2027");
    expect(realEstate).toHaveTextContent("Ubicación aproximada41,38792, 2,16992");

    post.mockResolvedValue({ id: 100 });
    await u.click(screen.getByRole("checkbox", { name: /Declaro que la información es veraz/ }));
    await u.click(screen.getByRole("button", { name: "Enviar a revisión" }));

    const form = post.mock.calls[0][1] as FormData;
    expect(JSON.parse(form.get("metadata") as string).real_estate).toEqual({
      purpose: "construction",
      intended_use: "rental",
      asset_type: "mixed",
      surface_m2: "1250.50",
      planned_housing_units: 12,
      estimated_works_end: "2027-06-30",
      estimated_rental_start: "2027-09-01",
      public_latitude: 41.387917,
      public_longitude: 2.169919,
    });
    expect(await screen.findByText("Oportunidad enviada a revisión")).toBeInTheDocument();
  });

  it("conserva les dades de l'immoble i la zona marcada en tornar enrere", async () => {
    const u = user();
    await goToRealEstate(u);
    await fillRealEstate(u);
    act(() => clickMap(41.5, 2.1));
    await u.click(continueButton());
    await u.click(screen.getByRole("button", { name: "Volver" }));

    expect(screen.getByRole("button", { name: /Finalidad/ })).toHaveTextContent("Adquisición y rehabilitación");
    expect(screen.getByRole("button", { name: /Tipo de activo/ })).toHaveTextContent("Comercial");
    expect(screen.getByLabelText("Superficie (m²)")).toHaveValue("180");
    expect(screen.getByText("Zona marcada: 41,50000, 2,10000")).toBeInTheDocument();
  });

  it("cancel·lar des del pas «Inmueble» no crea l'oportunitat", async () => {
    const u = user();
    await goToRealEstate(u);
    await fillRealEstate(u);

    await u.click(screen.getByRole("button", { name: "Cancelar" }));
    await u.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Descartar" }));

    expect(path()).toHaveTextContent(/^\/my-opportunities$/);
    expect(post).not.toHaveBeenCalled();
  });
});

describe("pas «Financiación»", () => {
  it("mostra el saldo disponible", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");

    await goToFunding(u);

    expect(await screen.findByText("8.000,00 €")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/me/wallet", expect.anything());
  });

  it("no continua sense objectiu, aportació mínima ni data límit", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");
    await goToFunding(u);
    await screen.findByText("8.000,00 €");

    await u.click(continueButton());

    expect(stepHeading()).toHaveTextContent("Financiación");
    expect(targetField()).toHaveAccessibleDescription("Introduce el objetivo de financiación.");
    expect(minimumField()).toHaveAccessibleDescription("Introduce la aportación mínima.");
    expect(deadlineField()).toHaveAccessibleDescription(expect.stringContaining("Indica la fecha límite de financiación."));
  });

  it("exigeix un objectiu positiu, un mínim que no el superi i una data límit futura", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");
    await goToFunding(u);
    await screen.findByText("8.000,00 €");

    await u.type(targetField(), "0");
    await u.type(minimumField(), "100");
    fireEvent.change(deadlineField(), { target: { value: "2020-01-01T10:00" } });
    await u.click(continueButton());

    expect(targetField()).toHaveAccessibleDescription("El objetivo de financiación debe ser mayor que 0.");
    expect(deadlineField()).toHaveAccessibleDescription(
      expect.stringContaining("La fecha límite debe ser posterior a la fecha actual."),
    );

    await u.clear(targetField());
    await u.type(targetField(), "50");
    await u.click(continueButton());

    expect(minimumField()).toHaveAccessibleDescription("La aportación mínima no puede superar el objetivo de financiación.");
    expect(stepHeading()).toHaveTextContent("Financiación");
  });

  it("amb 8.000,00 € disponibles, una aportació inicial de 9.000,00 € no deixa passar a la revisió", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");
    await goToFunding(u);

    await fillFunding(u, { initial: "9000" });
    await u.click(continueButton());

    expect(initialField()).toHaveAccessibleDescription(expect.stringContaining("No tienes saldo suficiente para esta aportación."));
    expect(stepHeading()).toHaveTextContent("Financiación");
  });

  it("l'aportació inicial ha d'estar entre l'aportació mínima i l'objectiu", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");
    await goToFunding(u);
    await fillFunding(u, { initial: "50" });

    await u.click(continueButton());
    expect(initialField()).toHaveAccessibleDescription(
      expect.stringContaining(eur("La aportación inicial debe ser de al menos 100,00 €, la aportación mínima.")),
    );

    await u.clear(targetField());
    await u.type(targetField(), "1000");
    await u.clear(initialField());
    await u.type(initialField(), "1500");
    await u.click(continueButton());
    expect(initialField()).toHaveAccessibleDescription(
      expect.stringContaining("La aportación inicial no puede superar el objetivo de financiación."),
    );
  });
});

describe("pas «Revisión» i enviament", () => {
  it("resumeix totes les dades i calcula el saldo que quedarà disponible", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");

    await goToReview(u, { initial: "5000" });

    const general = screen.getByRole("region", { name: "Información general" });
    expect(general).toHaveTextContent("Local comercial en Sabadell");
    expect(general).toHaveTextContent("Adquisición y reforma de un local.");
    expect(general).toHaveTextContent("Sabadell, Barcelona, España");
    expect(general).toHaveTextContent("Imágenes1");
    const realEstate = screen.getByRole("region", { name: "Inmueble" });
    expect(realEstate).toHaveTextContent("Finalidad · Uso · TipoAdquisición y rehabilitación · Alquiler · Comercial");
    expect(realEstate).toHaveTextContent("Superficie180 m²");
    expect(realEstate).toHaveTextContent("Inicio estimado del alquilerSin indicar");
    expect(realEstate).toHaveTextContent("Ubicación aproximadaSin indicar");
    expect(realEstate).not.toHaveTextContent("Viviendas previstas");
    const funding = screen.getByRole("region", { name: "Financiación" });
    expect(funding).toHaveTextContent("Objetivo de financiación150.000,00 €");
    expect(funding).toHaveTextContent("Aportación mínima100,00 €");
    expect(funding).toHaveTextContent("31 de enero de 2099 a las 23:59");
    expect(funding).toHaveTextContent("Tu aportación inicial5.000,00 €");
    expect(funding).toHaveTextContent("Saldo disponible tras el envío3.000,00 €");
  });

  it("sense aportació inicial ho indica al resum", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");

    await goToReview(u);

    expect(screen.getByRole("region", { name: "Financiación" })).toHaveTextContent("Sin aportación inicial");
    expect(screen.queryByText("Saldo disponible tras el envío")).not.toBeInTheDocument();
  });

  it("«Editar» torna a cada pas amb les dades conservades", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");
    await goToReview(u, { initial: "5000" });

    await u.click(screen.getByRole("button", { name: "Editar Información general" }));
    expect(stepHeading()).toHaveTextContent("Información general");
    expect(screen.getByLabelText("Título")).toHaveValue("Local comercial en Sabadell");
    expect(screen.getByLabelText("País")).toHaveValue("España");
    expect(screen.getAllByRole("img")).toHaveLength(1);

    await u.click(continueButton());
    await u.click(continueButton());
    // «Continuar» espera que es torni a consultar el saldo.
    await screen.findByText("8.000,00 €");
    await u.click(continueButton());
    expect(stepHeading()).toHaveTextContent("Revisión");

    await u.click(screen.getByRole("button", { name: "Editar Financiación" }));
    expect(stepHeading()).toHaveTextContent("Financiación");
    expect(targetField()).toHaveValue("150.000,00");
    expect(initialField()).toHaveValue("5.000,00");
    expect(deadlineField()).toHaveValue(FUTURE_DEADLINE);

    await u.click(screen.getByRole("button", { name: "Volver" }));
    await u.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByLabelText("Descripción")).toHaveValue("Adquisición y reforma de un local.");
  });

  it("«Enviar a revisión» només s'activa amb la declaració de veracitat i, en enviar, torna a Mis oportunidades", async () => {
    const u = user();
    const cover = image("portada.png");
    renderAt("/my-opportunities/new/real-estate");
    await fillGeneral(u, cover);
    await u.click(continueButton());
    await fillRealEstate(u);
    await u.click(continueButton());
    await fillFunding(u, { initial: "5000" });
    await u.click(continueButton());
    post.mockResolvedValue({ id: 99, title: "Local comercial en Sabadell" });

    const send = screen.getByRole("button", { name: "Enviar a revisión" });
    expect(send).toBeDisabled();
    await u.click(screen.getByRole("checkbox", { name: /Declaro que la información es veraz/ }));
    expect(send).toBeEnabled();
    await u.click(send);

    expect(post).toHaveBeenCalledOnce();
    const [url, body] = post.mock.calls[0];
    expect(url).toBe("/opportunities");
    const form = body as FormData;
    expect(JSON.parse(form.get("metadata") as string)).toEqual({
      type: "real_estate",
      title: "Local comercial en Sabadell",
      description: "Adquisición y reforma de un local.",
      location: { municipality: "Sabadell", province: "Barcelona", country: "España" },
      target_amount_cents: 15_000_000,
      minimum_contribution_cents: 10_000,
      deadline: "2099-01-31T22:59:00.000Z",
      initial_contribution_cents: 500_000,
      real_estate: REAL_ESTATE_PAYLOAD,
    });
    expect(form.getAll("images").map((file) => (file as File).name)).toEqual([cover.name]);

    expect(await screen.findByText("Oportunidad enviada a revisión")).toBeInTheDocument();
    expect(path()).toHaveTextContent(/^\/my-opportunities$/);
    expect(screen.getByText(/se publicará cuando sea aprobada/)).toHaveTextContent(
      "«Local comercial en Sabadell» se publicará cuando sea aprobada. Se han reservado 5.000,00 € de tu saldo como aportación inicial.",
    );
    // El saldo es torna a consultar després de reservar l'aportació inicial.
    expect(get.mock.calls.filter(([url]) => url === "/me/wallet")).toHaveLength(2);
  });

  it("si el saldo ja no arriba en enviar, mostra l'error i es queda a la revisió", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");
    await goToReview(u, { initial: "5000" });
    post.mockRejectedValue(new ApiError("Insufficient available balance", 409, null));

    await u.click(screen.getByRole("checkbox", { name: /Declaro que la información es veraz/ }));
    await u.click(screen.getByRole("button", { name: "Enviar a revisión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No tienes saldo suficiente para esta aportación.");
    expect(stepHeading()).toHaveTextContent("Revisión");
    expect(path()).toHaveTextContent(/^\/my-opportunities\/new\/real-estate$/);
  });
});

describe("cancel·lar", () => {
  it("«Cancelar» demana confirmació i «Seguir editando» conserva les dades", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");
    await u.type(screen.getByLabelText("Título"), "Local comercial en Sabadell");

    await u.click(screen.getByRole("button", { name: "Cancelar" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: "¿Descartar la oportunidad?" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Se perderán los datos introducidos.");

    await u.click(within(dialog).getByRole("button", { name: "Seguir editando" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Título")).toHaveValue("Local comercial en Sabadell");
    expect(path()).toHaveTextContent(/^\/my-opportunities\/new\/real-estate$/);
  });

  it("en confirmar, torna a Mis oportunidades sense crear l'oportunitat ni reservar saldo", async () => {
    const u = user();
    renderAt("/my-opportunities/new/real-estate");
    await goToReview(u, { initial: "5000" });

    await u.click(screen.getByRole("button", { name: "Cancelar" }));
    await u.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Descartar" }));

    expect(path()).toHaveTextContent(/^\/my-opportunities$/);
    expect(post).not.toHaveBeenCalled();
    expect(screen.queryByText("Oportunidad enviada a revisión")).not.toBeInTheDocument();
  });

  it("«Volver a mis oportunidades» també demana confirmació abans de sortir", async () => {
    const u = user();
    renderAt("/my-opportunities/new/equity");

    await u.click(screen.getByRole("button", { name: "Volver a mis oportunidades" }));
    expect(path()).toHaveTextContent(/^\/my-opportunities\/new\/equity$/);

    await u.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Descartar" }));

    expect(path()).toHaveTextContent(/^\/my-opportunities$/);
    expect(post).not.toHaveBeenCalled();
  });
});

describe("oportunitat empresarial (US06.1.2)", () => {
  const valuationField = () => screen.getByLabelText(/Valoración previa a la inversión/);
  const equityRow = () => screen.getByText("Participación ofrecida").parentElement;

  const goToBusiness = async (u: User) => {
    renderAt("/my-opportunities/new/equity");
    await fillGeneral(u);
    await u.click(continueButton());
    expect(stepHeading()).toHaveTextContent("Empresa");
  };

  const fillBusiness = async (u: User) => {
    await choose(u, /Sector/, "Alimentación y bebidas");
    await choose(u, /Fase de la empresa/, "Crecimiento");
    await u.type(valuationField(), "1350000");
  };

  it("no continua sense sector, fase ni valoració prèvia, i l'error apareix sota cada camp", async () => {
    const u = user();
    await goToBusiness(u);

    await u.click(continueButton());

    expect(stepHeading()).toHaveTextContent("Empresa");
    expect(screen.getByText("Selecciona el sector.")).toBeInTheDocument();
    expect(screen.getByText("Selecciona la fase de la empresa.")).toBeInTheDocument();
    expect(valuationField()).toHaveAccessibleDescription(
      expect.stringContaining("Introduce la valoración previa a la inversión."),
    );
  });

  it("exigeix una valoració prèvia positiva", async () => {
    const u = user();
    await goToBusiness(u);
    await choose(u, /Sector/, "Tecnología");
    await choose(u, /Fase de la empresa/, "Idea");
    await u.type(valuationField(), "0");

    await u.click(continueButton());

    expect(valuationField()).toHaveAccessibleDescription(expect.stringContaining("La valoración previa debe ser mayor que 0."));
    expect(stepHeading()).toHaveTextContent("Empresa");
  });

  it("amb una valoració d'1.350.000 €, un objectiu de 150.000 € mostra 10,0 % i s'actualitza en canviar-lo", async () => {
    const u = user();
    await goToBusiness(u);
    await fillBusiness(u);
    await u.click(continueButton());
    await screen.findByText("8.000,00 €");

    expect(equityRow()).toHaveTextContent("Participación ofrecida—");
    await u.type(targetField(), "150000");
    expect(equityRow()).toHaveTextContent("Participación ofrecida10,0 %");

    await u.clear(targetField());
    await u.type(targetField(), "450000");
    expect(equityRow()).toHaveTextContent("Participación ofrecida25,0 %");
  });

  it("resumeix l'empresa i la participació i envia l'oportunitat amb l'aportació inicial reservada", async () => {
    const u = user();
    await goToBusiness(u);
    await fillBusiness(u);
    await u.click(continueButton());
    await fillFunding(u, { initial: "5000" });
    await u.click(continueButton());

    const business = screen.getByRole("region", { name: "Empresa" });
    expect(business).toHaveTextContent("Sector · FaseAlimentación y bebidas · Crecimiento");
    expect(business).toHaveTextContent("Valoración previa a la inversión1.350.000,00 €");
    const funding = screen.getByRole("region", { name: "Financiación" });
    expect(funding).toHaveTextContent("Participación ofrecida10,0 %");
    expect(funding).toHaveTextContent("Saldo disponible tras el envío3.000,00 €");

    post.mockResolvedValue({ id: 101 });
    await u.click(screen.getByRole("checkbox", { name: /Declaro que la información es veraz/ }));
    await u.click(screen.getByRole("button", { name: "Enviar a revisión" }));

    const metadata = JSON.parse((post.mock.calls[0][1] as FormData).get("metadata") as string);
    expect(metadata).toMatchObject({
      type: "equity",
      target_amount_cents: 15_000_000,
      initial_contribution_cents: 500_000,
      business: { sector: "food_and_beverage", phase: "growth", pre_investment_valuation_cents: 135_000_000 },
    });
    expect(metadata).not.toHaveProperty("real_estate");
    expect(await screen.findByText("Oportunidad enviada a revisión")).toBeInTheDocument();
    expect(path()).toHaveTextContent(/^\/my-opportunities$/);
    expect(screen.getByText(/se publicará cuando sea aprobada/)).toHaveTextContent(
      "Se han reservado 5.000,00 € de tu saldo como aportación inicial.",
    );
  });

  it("conserva les dades de l'empresa en tornar enrere des de «Financiación»", async () => {
    const u = user();
    await goToBusiness(u);
    await fillBusiness(u);
    await u.click(continueButton());
    await u.click(screen.getByRole("button", { name: "Volver" }));

    expect(screen.getByRole("button", { name: /Sector/ })).toHaveTextContent("Alimentación y bebidas");
    expect(screen.getByRole("button", { name: /Fase de la empresa/ })).toHaveTextContent("Crecimiento");
    expect(valuationField()).toHaveValue("1.350.000,00");
  });

  it("cancel·lar des del pas «Empresa» no crea l'oportunitat", async () => {
    const u = user();
    await goToBusiness(u);
    await fillBusiness(u);

    await u.click(screen.getByRole("button", { name: "Cancelar" }));
    await u.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Descartar" }));

    expect(path()).toHaveTextContent(/^\/my-opportunities$/);
    expect(post).not.toHaveBeenCalled();
  });
});
