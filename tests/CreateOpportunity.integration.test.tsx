import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MyOpportunitiesPage from "../src/pages/my-opportunities/MyOpportunitiesPage";
import CreateOpportunityPage from "../src/pages/my-opportunities/create/CreateOpportunityPage";
import { useAuthStore } from "../src/store/useAuthStore";
import { useOpportunityStore } from "../src/store/useOpportunityStore";
import { useWalletStore } from "../src/store/useWalletStore";
import { clickMap } from "./support/reactLeaflet";

// Formulari de creació, «Mis oportunidades», stores i src/service/api.ts reals: l'únic límit de
// xarxa simulat és fetch. A part hi ha dues peces del navegador que jsdom no té:
// - react-leaflet: Leaflet necessita mides reals i descarregar tessel·les d'OpenStreetMap. Se
//   substitueix pel mateix doble que fan servir les proves unitàries (tests/support/reactLeaflet.tsx),
//   que deixa «fer clic al mapa» amb clickMap().
// - URL.createObjectURL / revokeObjectURL, que ImageThumbnail fa servir per a les vistes prèvies.
vi.mock("react-leaflet", async () => (await import("./support/reactLeaflet")).reactLeafletMock);

const fetchMock = vi.fn<typeof fetch>();

// Rellotge fix: la data límit s'escriu a mà i ha de ser futura sempre que s'executi la prova.
const NOW = "2026-11-24T10:00:00Z";
// Hora de Madrid a l'hivern (UTC+1): el formulari l'envia com a 2027-01-31T22:59:00.000Z.
const DEADLINE_MADRID = "2027-01-31T23:59";
const DEADLINE_ISO = "2027-01-31T22:59:00.000Z";

const WALLET = "GET /api/me/wallet";
const CREATE = "POST /api/opportunities";
const MINE = "GET /api/me/opportunities";
const ENTITIES = "GET /api/promotingentity";

// UserRead d'un compte amb entitat promotora (backend: app/schemas/auth.py).
const promoterAccount = {
  id: 2,
  email: "promotora@example.com",
  first_name: "Marta",
  last_name: "Soler",
  phone: "+34612345678",
  created_at: "2026-10-27T10:00:00Z",
  is_promoter: true,
};

// BalanceRead (backend: app/schemas/wallet.py).
const wallet = (available_cents: number, committed_cents = 0) => ({ available_cents, committed_cents, currency: "eur" });

// OpportunityRead que retorna el 201 de POST /api/opportunities: pendent de revisió, sense data
// de publicació (backend: app/schemas/opportunity.py).
const created = (overrides: Record<string, unknown> = {}) => ({
  id: 99,
  user_id: 2,
  type: "real_estate",
  title: "Local comercial en Sabadell",
  description: "Adquisición y reforma de un local.",
  location: "Sabadell, Barcelona, España",
  cover_image_url: "/api/opportunities/99/images/1",
  images: [{ id: 1, content_type: "image/png", position: 0, url: "/api/opportunities/99/images/1" }],
  target_amount_cents: 15_000_000,
  committed_cents: 0,
  deadline: "2027-01-31T22:59:00Z",
  date_published: null,
  date_closed: null,
  created_at: NOW,
  updated_at: NOW,
  ...overrides,
});

// PromoterOpportunitiesRead amb l'oportunitat acabada de crear: es llista, però les pendents de
// revisió no compten al resum ni tenen detall públic.
const myOpportunities = (overrides: Record<string, unknown> = {}) => ({
  summary: { committed_cents: 0, published_count: 0, in_funding_count: 0, pending_review_count: 1 },
  opportunities: [{
    id: 99,
    title: "Local comercial en Sabadell",
    type: "real_estate",
    funding_status: "pending_review",
    target_amount_cents: 15_000_000,
    committed_cents: 0,
    investors_count: 0,
    deadline: "2027-01-31T22:59:00Z",
    date_published: null,
    created_at: NOW,
    is_public: false,
    ...overrides,
  }],
});

// PromotingEntityRead (GET /api/promotingentity retorna totes les entitats).
const entities = () => [{
  user_id: 2,
  legal_name: "Promociones Ejemplo SL",
  image_url: null,
  published_projects_count: 0,
  experience_years: 11,
  founding_year: 2015,
  location: null,
}];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

type Reply = () => Response | Promise<Response>;

// Respostes per «MÈTODE ruta». Una petició que la prova no espera es rebutja i, a més, queda a
// la llista de `requests()`, que cada prova compara amb les peticions que havia de fer.
const serve = (routes: Record<string, Reply>) => {
  fetchMock.mockImplementation(async (url, init) => {
    const reply = routes[`${init?.method} ${String(url)}`];
    if (!reply) throw new Error(`Petició inesperada: ${init?.method} ${String(url)}`);
    return reply();
  });
};

const requests = () => fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${String(url)}`);

// Les parts del formulari multipart de cada POST /api/opportunities, ja llegides.
const createRequests = () => fetchMock.mock.calls
  .filter(([url, init]) => `${init?.method} ${String(url)}` === CREATE)
  .map(([url, init]) => {
    const body = init?.body;
    if (!(body instanceof FormData)) throw new Error("El cos de la petició no és un FormData");
    return {
      url: String(url),
      init,
      parts: [...body.keys()],
      metadata: JSON.parse(String(body.get("metadata"))) as Record<string, unknown>,
      images: body.getAll("images").filter((part): part is File => part instanceof File),
    };
  });

// Defineix les funcions d'URL que jsdom no té i retorna com desfer-ho.
const stubObjectUrls = () => {
  const names = ["createObjectURL", "revokeObjectURL"] as const;
  const originals = names.map((name) => Object.getOwnPropertyDescriptor(URL, name));
  Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: () => "blob:vista-previa" });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: () => undefined });
  return () => names.forEach((name, index) => {
    const original = originals[index];
    if (original) Object.defineProperty(URL, name, original);
    else Reflect.deleteProperty(URL, name);
  });
};

beforeEach(() => {
  // Només el rellotge: els temporitzadors reals segueixen funcionant per a React i Testing Library.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useOpportunityStore.setState(useOpportunityStore.getInitialState(), true);
  // reset() també cancel·la la consulta de saldo pendent, que setState no coneix.
  useWalletStore.getState().reset();
  useWalletStore.setState(useWalletStore.getInitialState(), true);
  useAuthStore.setState({ active_account: promoterAccount, status: "success", sessionChecked: true });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // El que retorna beforeEach s'executa en acabar cada prova.
  return stubObjectUrls();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const page = (type: "real-estate" | "equity") => render(
  <MemoryRouter initialEntries={[`/my-opportunities/new/${type}`]}>
    <Routes>
      <Route path="/my-opportunities" element={<MyOpportunitiesPage />} />
      <Route path="/my-opportunities/new/real-estate" element={<CreateOpportunityPage type="real_estate" />} />
      <Route path="/my-opportunities/new/equity" element={<CreateOpportunityPage type="equity" />} />
    </Routes>
  </MemoryRouter>,
);

type User = ReturnType<typeof userEvent.setup>;

const image = (name: string, type: string) => new File(["imatge"], name, { type });
const stepHeading = () => screen.getByRole("heading", { level: 2 });
const continueButton = () => screen.getByRole("button", { name: "Continuar" });
const sendButton = () => screen.getByRole("button", { name: "Enviar a revisión" });
const declaration = () => screen.getByRole("checkbox", { name: /Declaro que la información es veraz/ });

const choose = async (user: User, field: RegExp, option: string) => {
  await user.click(screen.getByRole("button", { name: field }));
  await user.click(screen.getByRole("option", { name: option }));
};

// Cada pas s'omple només amb el que exigeix per poder continuar.
const fillGeneral = async (user: User, images: File[]) => {
  await user.type(screen.getByLabelText("Título"), "Local comercial en Sabadell");
  await user.type(screen.getByLabelText("Descripción"), "Adquisición y reforma de un local.");
  await user.type(screen.getByLabelText("Municipio"), "Sabadell");
  await user.type(screen.getByLabelText("Provincia"), "Barcelona");
  await user.type(screen.getByLabelText("País"), "España");
  await user.upload(screen.getByLabelText("Añadir imágenes"), images);
  await user.click(continueButton());
};

const fillRealEstate = async (user: User) => {
  expect(stepHeading()).toHaveTextContent("Inmueble");
  await choose(user, /Finalidad/, "Adquisición y rehabilitación");
  await choose(user, /Uso previsto/, "Alquiler");
  await choose(user, /Tipo de activo/, "Comercial");
  await user.type(screen.getByLabelText("Superficie (m²)"), "180");
};

const fillBusiness = async (user: User) => {
  expect(stepHeading()).toHaveTextContent("Empresa");
  await choose(user, /Sector/, "Alimentación y bebidas");
  await choose(user, /Fase de la empresa/, "Crecimiento");
  await user.type(screen.getByLabelText(/Valoración previa a la inversión/), "1350000");
};

const fillFunding = async (user: User, { initial = "" } = {}) => {
  expect(stepHeading()).toHaveTextContent("Financiación");
  await user.type(screen.getByLabelText(/Objetivo de financiación/), "150000");
  await user.type(screen.getByLabelText(/Aportación mínima/), "100");
  fireEvent.change(screen.getByLabelText("Fecha límite de financiación"), { target: { value: DEADLINE_MADRID } });
  if (initial) await user.type(screen.getByLabelText(/Tu aportación inicial/), initial);
};

// Arriba a «Revisión» d'una oportunitat immobiliària amb 5.000,00 € d'aportació inicial.
const goToRealEstateReview = async (user: User) => {
  await fillGeneral(user, [image("portada.png", "image/png")]);
  await fillRealEstate(user);
  await user.click(continueButton());
  await screen.findByText("8.000,00 €");
  await fillFunding(user, { initial: "5000" });
  await user.click(continueButton());
  expect(stepHeading()).toHaveTextContent("Revisión");
};

const REAL_ESTATE_METADATA = {
  type: "real_estate",
  title: "Local comercial en Sabadell",
  description: "Adquisición y reforma de un local.",
  location: { municipality: "Sabadell", province: "Barcelona", country: "España" },
  target_amount_cents: 15_000_000,
  minimum_contribution_cents: 10_000,
  deadline: DEADLINE_ISO,
  initial_contribution_cents: 500_000,
  real_estate: {
    purpose: "acquisition_and_renovation",
    intended_use: "rental",
    asset_type: "commercial",
    // Decimal com a text; «Comercial» no té habitatges previstos.
    surface_m2: "180.00",
    planned_housing_units: null,
    estimated_works_end: null,
    estimated_rental_start: null,
    public_latitude: null,
    public_longitude: null,
  },
};

describe("Crear oportunidad: integración de formulario, stores y API", () => {
  it("envía un único POST multipart con `metadata` y las imágenes en orden y vuelve a «Mis oportunidades»", async () => {
    let finish!: (response: Response) => void;
    let balance = wallet(800_000);
    serve({
      [WALLET]: () => json(balance),
      [CREATE]: () => new Promise<Response>((resolve) => { finish = resolve; }),
      [MINE]: () => json(myOpportunities({ committed_cents: 500_000, investors_count: 1 })),
      [ENTITIES]: () => json(entities()),
    });
    const user = userEvent.setup({ delay: null });

    page("real-estate");
    await fillGeneral(user, [image("portada.png", "image/png"), image("segunda.webp", "image/webp")]);
    await fillRealEstate(user);
    act(() => { clickMap(41.5463, 2.1086); });
    await user.click(continueButton());
    // El saldo es consulta en arribar a «Financiación», no abans.
    expect(await screen.findByText("8.000,00 €")).toBeInTheDocument();
    expect(requests()).toEqual([WALLET]);
    expect(fetchMock).toHaveBeenCalledWith("/api/me/wallet", expect.objectContaining({ method: "GET", credentials: "include" }));
    await fillFunding(user, { initial: "5000" });
    await user.click(continueButton());

    // Fins a la declaració de veracitat no es pot enviar res.
    expect(stepHeading()).toHaveTextContent("Revisión");
    expect(sendButton()).toBeDisabled();
    await user.click(declaration());
    await user.dblClick(sendButton());

    // Mentre el backend no respon: una sola petició i tot el formulari bloquejat.
    expect(createRequests()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
    expect(screen.getByRole("form", { name: "Revisión" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Editar Información general" })).toBeDisabled();
    expect(declaration()).toBeDisabled();

    const [request] = createRequests();
    expect(request.url).toBe("/api/opportunities");
    expect(request.init?.method).toBe("POST");
    expect(request.init?.credentials).toBe("include");
    // Sense Content-Type propi: el navegador hi posa «multipart/form-data» amb el seu separador.
    expect(new Headers(request.init?.headers).has("Content-Type")).toBe(false);
    expect(request.parts).toEqual(["metadata", "images", "images"]);
    expect(request.metadata).toEqual({
      ...REAL_ESTATE_METADATA,
      real_estate: { ...REAL_ESTATE_METADATA.real_estate, public_latitude: 41.5463, public_longitude: 2.1086 },
    });
    // La primera imatge és la portada: l'ordre de tria es conserva.
    expect(request.images.map((file) => [file.name, file.type])).toEqual([
      ["portada.png", "image/png"],
      ["segunda.webp", "image/webp"],
    ]);

    balance = wallet(300_000, 500_000);
    await act(async () => finish(json(created({ committed_cents: 500_000 }), 201)));

    const notice = await screen.findByText("Oportunidad enviada a revisión");
    expect(screen.getByRole("heading", { level: 1, name: "Mis oportunidades" })).toBeInTheDocument();
    expect(notice.closest("[role=status]")).toHaveTextContent(
      "«Local comercial en Sabadell» se publicará cuando sea aprobada. Se han reservado 5.000,00 € de tu saldo como aportación inicial.",
    );

    // La llista real de l'entitat: pendent de revisió i encara sense detall públic.
    const card = await screen.findByRole("article", { name: "Local comercial en Sabadell" });
    expect(card).toHaveTextContent("Pendiente de revisión");
    expect(card).toHaveTextContent("Creada el 24 nov 2026");
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Promociones Ejemplo SL")).toBeInTheDocument();

    // Un sol POST; després es torna a llegir el saldo (l'aportació inicial ja està reservada) i
    // la pàgina de destinació demana les seves dades.
    expect(requests().slice(0, 3)).toEqual([WALLET, CREATE, WALLET]);
    expect(requests().slice(3).sort()).toEqual([MINE, ENTITIES]);
  });

  it.each([
    {
      name: "un 409 porque el saldo ya no cubre la aportación inicial",
      failure: () => json({ detail: "Insufficient available balance" }, 409),
      message: "No tienes saldo suficiente para esta aportación.",
    },
    {
      name: "un 422 porque el backend rechaza una imagen",
      failure: () => json({ detail: "Image content type does not match its content" }, 422),
      message: "Alguna imagen no es válida. Usa imágenes JPG, PNG o WebP de hasta 5 MB.",
    },
    {
      name: "un error de red",
      failure: () => Promise.reject(new TypeError("Failed to fetch")),
      message: "No se ha podido enviar la oportunidad. Inténtalo de nuevo.",
    },
  ])("tras $name se queda en «Revisión» con el borrador intacto y se puede reenviar", async ({ failure, message }) => {
    let fails = true;
    serve({
      [WALLET]: () => json(wallet(800_000)),
      [CREATE]: () => fails ? failure() : json(created({ committed_cents: 500_000 }), 201),
      [MINE]: () => json(myOpportunities({ committed_cents: 500_000, investors_count: 1 })),
      [ENTITIES]: () => json(entities()),
    });
    const user = userEvent.setup({ delay: null });

    page("real-estate");
    await goToRealEstateReview(user);
    await user.click(declaration());
    await user.click(sendButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(stepHeading()).toHaveTextContent("Revisión");
    expect(screen.queryByText("Oportunidad enviada a revisión")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Financiación" })).toHaveTextContent("Tu aportación inicial5.000,00 €");
    expect(declaration()).toBeChecked();
    expect(sendButton()).toBeEnabled();
    // Ni saldo nou ni «Mis oportunidades»: l'enviament fallit no ha desencadenat res més.
    expect(requests()).toEqual([WALLET, CREATE]);

    // Totes les dades segueixen al formulari per poder corregir-les.
    await user.click(screen.getByRole("button", { name: "Editar Información general" }));
    expect(screen.getByLabelText("Título")).toHaveValue("Local comercial en Sabadell");
    expect(screen.getByLabelText("Descripción")).toHaveValue("Adquisición y reforma de un local.");
    expect(screen.getByRole("img", { name: "portada.png" })).toBeInTheDocument();
    await user.click(continueButton());
    expect(screen.getByLabelText("Superficie (m²)")).toHaveValue("180");
    await user.click(continueButton());
    // «Continuar» espera la consulta del saldo, que es repeteix en tornar a «Financiación».
    await screen.findByText("8.000,00 €");
    expect(screen.getByLabelText(/Objetivo de financiación/)).toHaveValue("150.000,00");
    expect(screen.getByLabelText(/Tu aportación inicial/)).toHaveValue("5.000,00");
    expect(screen.getByLabelText("Fecha límite de financiación")).toHaveValue(DEADLINE_MADRID);
    await user.click(continueButton());
    expect(stepHeading()).toHaveTextContent("Revisión");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fails = false;
    await user.click(sendButton());

    expect(await screen.findByText("Oportunidad enviada a revisión")).toBeInTheDocument();
    const sent = createRequests();
    expect(sent).toHaveLength(2);
    expect(sent[0].metadata).toEqual(REAL_ESTATE_METADATA);
    expect(sent[1].metadata).toEqual(REAL_ESTATE_METADATA);
    expect(sent.map((request) => request.images.map((file) => file.name))).toEqual([["portada.png"], ["portada.png"]]);
  });

  it("una oportunidad empresarial envía `business` y no `real_estate`, sin aportación inicial", async () => {
    serve({
      [WALLET]: () => json(wallet(800_000)),
      [CREATE]: () => json(created({ type: "equity" }), 201),
      [MINE]: () => json(myOpportunities({ type: "equity" })),
      [ENTITIES]: () => json(entities()),
    });
    const user = userEvent.setup({ delay: null });

    page("equity");
    await fillGeneral(user, [image("portada.png", "image/png")]);
    await fillBusiness(user);
    await user.click(continueButton());
    await screen.findByText("8.000,00 €");
    await fillFunding(user);
    // 150.000 € d'objectiu sobre 1.350.000 € de valoració prèvia: el 10 % de l'empresa.
    expect(screen.getByText("Participación ofrecida").parentElement).toHaveTextContent("10,0 %");
    await user.click(continueButton());
    await user.click(declaration());
    await user.click(sendButton());

    const notice = await screen.findByText("Oportunidad enviada a revisión");
    // Sense aportació inicial no s'ha reservat cap import.
    expect(notice.closest("[role=status]")).toHaveTextContent("«Local comercial en Sabadell» se publicará cuando sea aprobada.");
    expect(notice.closest("[role=status]")).not.toHaveTextContent("Se han reservado");
    expect(await screen.findByRole("article", { name: "Local comercial en Sabadell" })).toHaveTextContent("Empresarial");

    const sent = createRequests();
    expect(sent).toHaveLength(1);
    expect(sent[0].init?.method).toBe("POST");
    expect(sent[0].init?.credentials).toBe("include");
    expect(sent[0].parts).toEqual(["metadata", "images"]);
    // BusinessOpportunityCreate: la participació oferta no s'envia, la calcula el backend.
    expect(sent[0].metadata).toEqual({
      type: "equity",
      title: "Local comercial en Sabadell",
      description: "Adquisición y reforma de un local.",
      location: { municipality: "Sabadell", province: "Barcelona", country: "España" },
      target_amount_cents: 15_000_000,
      minimum_contribution_cents: 10_000,
      deadline: DEADLINE_ISO,
      initial_contribution_cents: null,
      business: { sector: "food_and_beverage", phase: "growth", pre_investment_valuation_cents: 135_000_000 },
    });
    expect(sent[0].metadata).not.toHaveProperty("real_estate");
    expect(sent[0].images.map((file) => file.name)).toEqual(["portada.png"]);
  });

  it("si no se puede leer el saldo en «Financiación» no valida la aportación inicial hasta que «Reintentar» lo consigue", async () => {
    let fails = true;
    serve({
      [WALLET]: () => fails ? json({ detail: "Internal Server Error" }, 500) : json(wallet(800_000)),
    });
    const user = userEvent.setup({ delay: null });

    page("equity");
    await fillGeneral(user, [image("portada.png", "image/png")]);
    await fillBusiness(user);
    await user.click(continueButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("No se ha podido consultar tu saldo.");
    expect(screen.getByText("Saldo disponible").parentElement).toHaveTextContent("No disponible");
    await fillFunding(user, { initial: "5000" });
    await user.click(continueButton());

    expect(stepHeading()).toHaveTextContent("Financiación");
    expect(screen.getByLabelText(/Tu aportación inicial/)).toHaveAccessibleDescription(
      expect.stringContaining("No se ha podido consultar tu saldo para comprobar la aportación."),
    );

    fails = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("8.000,00 €")).toBeInTheDocument();
    // El que s'havia escrit segueix al formulari.
    expect(screen.getByLabelText(/Tu aportación inicial/)).toHaveValue("5.000,00");
    await user.click(continueButton());
    expect(stepHeading()).toHaveTextContent("Revisión");
    expect(screen.getByRole("region", { name: "Financiación" })).toHaveTextContent("Saldo disponible tras el envío3.000,00 €");
    expect(requests()).toEqual([WALLET, WALLET]);
  });
});
