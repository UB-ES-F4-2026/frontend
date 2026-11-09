import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OpportunityCard from "../src/pages/opportunities/common/OpportunityCard";
import RealEstateDetail from "../src/pages/opportunities/real-estate/RealEstateDetail";
import type {
  Opportunity,
  RealEstateOpportunityGetResponse,
} from "../src/store/useOpportunityStore";

// Estado simulado de useOpportunityStore
const opportunityState = vi.hoisted(() => ({
  status: "idle" as "idle" | "loading" | "success" | "error",
  details: "",
  opportunities: [] as Opportunity[],
  fetchOpportunities: vi.fn(),
  detailStatus: "idle" as "idle" | "loading" | "success" | "error",
  detailId: null as number | null,
  detailDetails: "",
  realEstateOpportunity: null as RealEstateOpportunityGetResponse | null,
  fetchRealEstateOpportunity: vi.fn(),
}));

// Estado simulado de useAuthStore (para probar protección de ruta, acceso desde OpportunityCard y modal)
const authState = vi.hoisted(() => ({
  status: "idle" as "idle" | "loading" | "success" | "error",
  details: "",
  active_account: null as { id: number; email: string; created_at: string } | null,
  login: vi.fn(),
  registrationStatus: "idle" as "idle" | "loading" | "success" | "error",
  registrationDetails: "",
  register: vi.fn(),
  resetRegistration: vi.fn(),
  logout: vi.fn(),
}));

// Reloj controlado para probar plazos en curso/vencidos y fechas pasadas/futuras
const nowRef = vi.hoisted(() => ({
  value: new Date("2026-11-09T12:00:00.000Z").getTime(),
}));

vi.mock("../src/store/useOpportunityStore", () => ({
  useOpportunityStore: (selector?: (value: typeof opportunityState) => unknown) =>
    selector ? selector(opportunityState) : opportunityState,
}));

vi.mock("../src/store/useAuthStore", () => ({
  useAuthStore: (selector?: (value: typeof authState) => unknown) =>
    selector ? selector(authState) : authState,
}));

vi.mock("../src/hooks/useNow", () => ({
  useNow: () => nowRef.value,
}));

function buildRealEstateOpportunity(
  overrides: Partial<RealEstateOpportunityGetResponse> = {},
): RealEstateOpportunityGetResponse {
  return {
    id: 23,
    user_id: 10,
    type: "real_estate",
    title: "Rehabilitación Residencial Eixample",
    description:
      "Proyecto de rehabilitación integral en el centro de Barcelona.\n\nEl edificio cuenta con fachada histórica protegida y zonas comunes ajardinadas.\nCertificación energética A prevista tras la entrega.",
    location: "Barcelona, Cataluña",
    cover_image_url: "https://example.com/cover.jpg",
    target_amount_cents: 100_000_00,
    committed_cents: 65_000_00,
    minimum_contribution_cents: 500_00,
    deadline: "2026-12-15T18:30:00.000Z",
    date_published: "2026-10-01T09:00:00.000Z",
    date_closed: null,
    created_at: "2026-09-25T10:00:00.000Z",
    updated_at: "2026-10-01T09:00:00.000Z",
    server_time: "2026-11-09T12:00:00.000Z",
    promoter: {
      user_id: 10,
      legal_name: "Promociones Mediterráneo S.L.",
      image_url: "https://example.com/promoter.jpg",
      published_projects_count: 14,
      experience_years: 12,
      location: "Barcelona",
    },
    real_estate: {
      purpose: "acquisition_and_renovation",
      intended_use: "rental",
      asset_type: "residential",
      surface_m2: 1450,
      planned_housing_units: 18,
      estimated_works_end: "2027-06-30T00:00:00.000Z",
      estimated_rental_start: "2027-09-01T00:00:00.000Z",
      public_latitude: 41.391,
      public_longitude: 2.165,
      images: [
        "https://example.com/re-1.jpg",
        "https://example.com/re-2.jpg",
        "https://example.com/re-3.jpg",
      ],
    },
    ...overrides,
  };
}

function CurrentPath() {
  return <output aria-label="Ruta actual">{useLocation().pathname}</output>;
}

function renderRealEstateDetail(initialEntry = "/opportunities/real-estate/23") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/opportunities/real-estate/:id" element={<RealEstateDetail />} />
        <Route path="/opportunities" element={<h1>Página simulada: listado de oportunidades</h1>} />
        <Route path="/login" element={<h1>Página simulada: login</h1>} />
      </Routes>
      <CurrentPath />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();

  nowRef.value = new Date("2026-11-09T12:00:00.000Z").getTime();

  opportunityState.status = "idle";
  opportunityState.details = "";
  opportunityState.opportunities = [];
  opportunityState.detailStatus = "success";
  opportunityState.detailId = 23;
  opportunityState.detailDetails = "";
  opportunityState.realEstateOpportunity = buildRealEstateOpportunity();

  authState.status = "idle";
  authState.details = "";
  authState.active_account = {
    id: 1,
    email: "sergio@example.com",
    created_at: "2026-10-17T10:00:00Z",
  };

  // Polyfill de HTMLDialogElement para JSDOM (usado en el zoom de OpportunityGallery)
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});

describe("RealEstateDetail - Enrutado, protección de sesión, estados de carga y errores", () => {
  it.each(["abc", "0", "-5", "12.5"])(
    "muestra el mensaje de ruta inválida para el parámetro id='%s' sin llamar al store",
    (invalidId) => {
      renderRealEstateDetail(`/opportunities/real-estate/${invalidId}`);

      expect(opportunityState.fetchRealEstateOpportunity).not.toHaveBeenCalled();
      expect(
        screen.getByRole("heading", { level: 1, name: "Oportunidad no encontrada" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText("La dirección no corresponde a ninguna oportunidad inmobiliaria."),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Volver a oportunidades/i })).toHaveAttribute(
        "href",
        "/opportunities",
      );
    },
  );

  it("redirige a /login cuando el estado de autenticación no es 'idle' y no hay sesión activa", async () => {
    authState.status = "error";
    authState.active_account = null;

    renderRealEstateDetail("/opportunities/real-estate/23");

    expect(
      await screen.findByRole("heading", { name: "Página simulada: login" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/login$/);
  });

  it("no redirige a /login mientras el estado de autenticación está en 'idle' aunque aún no haya cuenta", () => {
    authState.status = "idle";
    authState.active_account = null;

    renderRealEstateDetail("/opportunities/real-estate/23");

    expect(
      screen.getByRole("heading", { level: 1, name: "Rehabilitación Residencial Eixample" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(
      /^\/opportunities\/real-estate\/23$/,
    );
  });

  it("solicita el detalle al montarse y muestra el skeleton mientras detailStatus es 'loading'", () => {
    opportunityState.detailStatus = "loading";
    opportunityState.detailId = 23;
    opportunityState.realEstateOpportunity = null;

    renderRealEstateDetail("/opportunities/real-estate/23");

    expect(opportunityState.fetchRealEstateOpportunity).toHaveBeenCalledExactlyOnceWith(23);
    expect(
      screen.queryByRole("heading", { level: 1, name: "Rehabilitación Residencial Eixample" }),
    ).not.toBeInTheDocument();
  });

  it("muestra el skeleton si detailId no coincide con el id de la ruta (evita parpadeo de datos antiguos)", () => {
    opportunityState.detailStatus = "success";
    opportunityState.detailId = 99; // Datos de una oportunidad anterior

    renderRealEstateDetail("/opportunities/real-estate/23");

    expect(opportunityState.fetchRealEstateOpportunity).toHaveBeenCalledExactlyOnceWith(23);
    expect(
      screen.queryByRole("heading", { level: 1, name: "Rehabilitación Residencial Eixample" }),
    ).not.toBeInTheDocument();
  });

  it("muestra el estado de error con los detalles del fallo y permite reintentar la carga", async () => {
    opportunityState.detailStatus = "error";
    opportunityState.detailId = 23;
    opportunityState.detailDetails = "Error al obtener la oportunidad (HTTP 500)";
    opportunityState.realEstateOpportunity = null;

    renderRealEstateDetail("/opportunities/real-estate/23");

    expect(
      screen.getByRole("heading", { level: 1, name: "No se ha podido cargar la oportunidad" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Error al obtener la oportunidad (HTTP 500)")).toBeInTheDocument();

    const retryButton = screen.getByRole("button", { name: "Reintentar" });
    await userEvent.setup().click(retryButton);

    // 1 vez al montar + 1 vez al pulsar Reintentar
    expect(opportunityState.fetchRealEstateOpportunity).toHaveBeenCalledTimes(2);
    expect(opportunityState.fetchRealEstateOpportunity).toHaveBeenLastCalledWith(23);
  });

  it("muestra 'Oportunidad no encontrada' cuando la respuesta es nula o no es de tipo 'real_estate'", () => {
    opportunityState.detailStatus = "success";
    opportunityState.detailId = 23;
    opportunityState.realEstateOpportunity = buildRealEstateOpportunity({ type: "equity" });

    renderRealEstateDetail("/opportunities/real-estate/23");

    expect(
      screen.getByRole("heading", { level: 1, name: "Oportunidad no encontrada" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Es posible que se haya retirado o que la dirección no sea correcta."),
    ).toBeInTheDocument();
  });

  it("permite volver al listado de oportunidades mediante el enlace superior", async () => {
    renderRealEstateDetail("/opportunities/real-estate/23");

    await userEvent.setup().click(screen.getByRole("link", { name: /Volver a oportunidades/i }));

    expect(
      await screen.findByRole("heading", { name: "Página simulada: listado de oportunidades" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/opportunities$/);
  });
});

describe("RealEstateDetail - Contenido del detalle inmobiliario e inversión", () => {
  it("renderiza el título, la ubicación, la entradilla del hero y los párrafos restantes en el resumen", () => {
    renderRealEstateDetail();

    expect(
      screen.getByRole("heading", { level: 1, name: "Rehabilitación Residencial Eixample" }),
    ).toBeInTheDocument();

    // Primer párrafo como entradilla y el resto en la sección de resumen
    expect(
      screen.getByText("Proyecto de rehabilitación integral en el centro de Barcelona."),
    ).toBeInTheDocument();

    const summarySection = screen.getByRole("region", { name: "Resumen del proyecto" });
    expect(
      within(summarySection).queryByText(
        "Proyecto de rehabilitación integral en el centro de Barcelona.",
      ),
    ).not.toBeInTheDocument();
    expect(
      within(summarySection).getByText(
        "El edificio cuenta con fachada histórica protegida y zonas comunes ajardinadas.",
      ),
    ).toBeInTheDocument();
    expect(
      within(summarySection).getByText("Certificación energética A prevista tras la entrega."),
    ).toBeInTheDocument();
  });

  it("muestra un único párrafo directamente en 'Resumen del proyecto' sin duplicarlo como entradilla", () => {
    opportunityState.realEstateOpportunity = buildRealEstateOpportunity({
      description: "Descripción de un único párrafo sin saltos de línea.",
    });

    renderRealEstateDetail();

    const matches = screen.getAllByText("Descripción de un único párrafo sin saltos de línea.");
    expect(matches).toHaveLength(1);

    const summarySection = screen.getByRole("region", { name: "Resumen del proyecto" });
    expect(
      within(summarySection).getByText("Descripción de un único párrafo sin saltos de línea."),
    ).toBeInTheDocument();
  });

  it("muestra la tarjeta de financiación activa con importes, barra de progreso, hora de Madrid y advertencia legal", () => {
    renderRealEstateDetail();

    expect(screen.getByText("En financiación")).toBeInTheDocument();

    expect(screen.getByText("65.000,00 €")).toBeInTheDocument();
    expect(screen.getByText("100.000,00 €")).toBeInTheDocument();
    expect(screen.getByText("500,00 €")).toBeInTheDocument();
    expect(screen.getByText("65,0 % del objetivo")).toBeInTheDocument();

    const progressbar = screen.getByRole("progressbar", {
      name: "Capital comprometido respecto al objetivo",
    });
    expect(progressbar).toHaveAttribute("aria-valuenow", "65");

    expect(screen.getByText(/Hora de Madrid \(UTC\+0?1(:00)?\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/El capital comprometido no equivale a dinero cobrado/i),
    ).toBeInTheDocument();
  });

  it("habilita el botón 'Quiero invertir', muestra el texto informativo de condiciones y lanza el aviso al pulsarlo", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();
    renderRealEstateDetail();

    expect(
      screen.getByText(
        /Puede invertir en esta iniciativa siempre que no se haya alcanzado el capital objetivo y no haya finalizado el plazo de financiación\./i,
      ),
    ).toBeInTheDocument();

    const investButton = screen.getByRole("button", { name: "Quiero invertir" });
    expect(investButton).toBeEnabled();

    await user.click(investButton);

    expect(alertSpy).toHaveBeenCalledExactlyOnceWith(
      "Funcionalidad de inversión disponible en futuras iteraciones.",
    );
    alertSpy.mockRestore();
  });

  it("deshabilita el botón 'Quiero invertir' cuando se ha alcanzado o superado el capital objetivo aunque el plazo siga abierto", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();
    opportunityState.realEstateOpportunity = buildRealEstateOpportunity({
      target_amount_cents: 100_000_00,
      committed_cents: 100_000_00, // 100 % alcanzado
    });

    renderRealEstateDetail();

    expect(screen.getByText("En financiación")).toBeInTheDocument();
    const investButton = screen.getByRole("button", { name: "Quiero invertir" });
    expect(investButton).toBeDisabled();

    await user.click(investButton);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("indica 'Plazo finalizado', deshabilita 'Quiero invertir' cuando vence el deadline y limita la barra al 100 %", () => {
    nowRef.value = new Date("2027-01-01T00:00:00.000Z").getTime();
    opportunityState.realEstateOpportunity = buildRealEstateOpportunity({
      target_amount_cents: 100_000_00,
      committed_cents: 120_000_00, // 120 % comprometido
    });

    renderRealEstateDetail();

    expect(screen.getByText("Plazo finalizado")).toBeInTheDocument();
    const progressbar = screen.getByRole("progressbar", {
      name: "Capital comprometido respecto al objetivo",
    });
    expect(progressbar).toHaveAttribute("aria-valuenow", "100");

    const investButton = screen.getByRole("button", { name: "Quiero invertir" });
    expect(investButton).toBeDisabled();
  });

  it("deshabilita 'Quiero invertir' cuando el plazo ha finalizado aunque no se haya alcanzado el capital objetivo", () => {
    nowRef.value = new Date("2027-01-01T00:00:00.000Z").getTime();
    opportunityState.realEstateOpportunity = buildRealEstateOpportunity({
      target_amount_cents: 100_000_00,
      committed_cents: 40_000_00, // 40 % comprometido pero fuera de plazo
    });

    renderRealEstateDetail();

    expect(screen.getByText("Plazo finalizado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quiero invertir" })).toBeDisabled();
  });

  it("muestra los datos de la entidad promotora, las traducciones de finalidad/uso y las características del inmueble", () => {
    renderRealEstateDetail();

    const promoterSection = screen.getByRole("region", { name: "Entidad promotora" });
    expect(within(promoterSection).getByText("Promociones Mediterráneo S.L.")).toBeInTheDocument();
    expect(within(promoterSection).getByText("14")).toBeInTheDocument();
    expect(within(promoterSection).getByText(/12/)).toBeInTheDocument();
    expect(
      within(promoterSection).getByText("Dato declarado por la entidad"),
    ).toBeInTheDocument();
    expect(within(promoterSection).getByText("Barcelona")).toBeInTheDocument();

    const summarySection = screen.getByRole("region", { name: "Resumen del proyecto" });
    expect(
      within(summarySection).getByText("Adquisición y rehabilitación"),
    ).toBeInTheDocument();
    expect(within(summarySection).getByText("Alquiler")).toBeInTheDocument();

    const featuresSection = screen.getByRole("region", {
      name: "Características del inmueble",
    });
    expect(within(featuresSection).getByText(/1\.?450 m²/)).toBeInTheDocument();
    expect(within(featuresSection).getByText("18")).toBeInTheDocument();
  });

  it("clasifica las fechas del proyecto en pasadas y futuras y omite los hitos opcionales nulos", () => {
    opportunityState.realEstateOpportunity = buildRealEstateOpportunity({
      real_estate: {
        ...buildRealEstateOpportunity().real_estate,
        estimated_works_end: "2027-06-30T00:00:00.000Z",
        estimated_rental_start: null, // No debe renderizarse en la lista
      },
    });

    renderRealEstateDetail();

    const datesSection = screen.getByRole("region", { name: "Fechas del proyecto" });
    const items = within(datesSection).getAllByRole("listitem");
    expect(items).toHaveLength(3);

    // Publicación (2026-10-01) <= now (2026-11-09) -> Fecha pasada
    expect(items[0]).toHaveAttribute("data-past", "true");
    expect(within(items[0]).getByText("Publicación")).toBeInTheDocument();
    expect(within(items[0]).getByText("Fecha pasada")).toBeInTheDocument();

    // Fin de financiación (2026-12-15) > now -> Fecha futura
    expect(items[1]).toHaveAttribute("data-past", "false");
    expect(within(items[1]).getByText("Fin de financiación")).toBeInTheDocument();
    expect(within(items[1]).getByText("Fecha futura")).toBeInTheDocument();

    // Finalización estimada de las obras (2027-06-30) > now -> Fecha futura
    expect(items[2]).toHaveAttribute("data-past", "false");
    expect(
      within(items[2]).getByText("Finalización estimada de las obras"),
    ).toBeInTheDocument();

    expect(
      within(datesSection).queryByText("Inicio estimado del alquiler"),
    ).not.toBeInTheDocument();
  });

  it("renderiza el mapa interactivo de OpenStreetMap con coordenadas válidas y el aviso cuando no están disponibles", () => {
    const { unmount } = renderRealEstateDetail();

    const mapIframe = screen.getByTitle("Mapa de la ubicación aproximada");
    expect(mapIframe).toBeInTheDocument();
    expect(mapIframe).toHaveAttribute(
      "src",
      expect.stringContaining("https://www.openstreetmap.org/export/embed.html"),
    );
    expect(mapIframe).toHaveAttribute("src", expect.stringContaining("marker=41.391,2.165"));

    unmount();

    opportunityState.realEstateOpportunity = buildRealEstateOpportunity({
      real_estate: {
        ...buildRealEstateOpportunity().real_estate,
        public_latitude: Number.NaN,
        public_longitude: Number.NaN,
      },
    });

    renderRealEstateDetail();
    expect(screen.getByText("Mapa no disponible")).toBeInTheDocument();
    expect(screen.queryByTitle("Mapa de la ubicación aproximada")).not.toBeInTheDocument();
  });
});

describe("RealEstateDetail - Galería de imágenes (OpportunityGallery)", () => {
  it("permite navegar entre imágenes con los botones, miniaturas y el diálogo de ampliación", async () => {
    const user = userEvent.setup();
    renderRealEstateDetail();

    // Como está en la página y oculto en el diálogo, habrá 2 instancias
    expect(screen.getAllByText("Imagen 1 de 3").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("img", { name: "Imagen 1 de Rehabilitación Residencial Eixample" }),
    ).toHaveAttribute("src", "https://example.com/re-1.jpg");

    // Avanzar a la imagen 2
    await user.click(screen.getByRole("button", { name: "Imagen siguiente" }));
    expect(screen.getAllByText("Imagen 2 de 3").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("img", { name: "Imagen 2 de Rehabilitación Residencial Eixample" }),
    ).toHaveAttribute("src", "https://example.com/re-2.jpg");

    // Seleccionar directamente la miniatura 3
    await user.click(screen.getByRole("button", { name: "Mostrar imagen 3 de 3" }));
    expect(screen.getAllByText("Imagen 3 de 3").length).toBeGreaterThan(0);

    // Abrir el diálogo de imagen ampliada y navegar con el teclado
    await user.click(screen.getByRole("button", { name: "Ampliar imagen 3 de 3" }));
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce();

    const dialog = screen.getByRole("dialog", { name: "Imagen ampliada del inmueble" });
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(within(dialog).getByText("Imagen 1 de 3")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledOnce();
  });

  it("usa cover_image_url e image_url del promotor como respaldo cuando real_estate.images está vacío", () => {
    opportunityState.realEstateOpportunity = buildRealEstateOpportunity({
      real_estate: {
        ...buildRealEstateOpportunity().real_estate,
        images: [],
      },
    });

    renderRealEstateDetail();

    expect(screen.getAllByText("Imagen 1 de 2").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("img", { name: "Imagen de Rehabilitación Residencial Eixample" }),
    ).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("muestra 'Imagen no disponible' cuando no hay ninguna imagen o cuando falla la carga de la imagen actual", () => {
    const { unmount } = renderRealEstateDetail();

    const mainImage = screen.getByRole("img", {
      name: "Imagen 1 de Rehabilitación Residencial Eixample",
    });
    fireEvent.error(mainImage);

    expect(screen.getByRole("button", { name: "Imagen no disponible" })).toBeDisabled();

    unmount();

    opportunityState.realEstateOpportunity = buildRealEstateOpportunity({
      cover_image_url: null,
      promoter: {
        ...buildRealEstateOpportunity().promoter,
        image_url: null,
      },
      real_estate: {
        ...buildRealEstateOpportunity().real_estate,
        images: null,
      },
    });

    renderRealEstateDetail();
    expect(screen.getByText("Imagen no disponible")).toBeInTheDocument();
  });
});

describe("Acceso al detalle desde OpportunityCard y LoginToViewDetailModal", () => {
  const sampleRealEstateCard: Opportunity = {
    id: 23,
    user_id: 10,
    type: "real_estate",
    title: "Rehabilitación Residencial Eixample",
    description: "Descripción breve",
    location: "Barcelona",
    cover_image_url: null,
    target_amount_cents: 100_000_00,
    committed_cents: 50_000_00,
    deadline: "2026-12-15T18:30:00.000Z",
    date_published: "2026-10-01T09:00:00.000Z",
    date_closed: null,
    created_at: "2026-09-25T10:00:00.000Z",
    updated_at: "2026-10-01T09:00:00.000Z",
  };

  function renderCardWithRoutes(opportunity: Opportunity = sampleRealEstateCard) {
    return render(
      <MemoryRouter initialEntries={["/opportunities"]}>
        <Routes>
          <Route path="/opportunities" element={<OpportunityCard opportunity={opportunity} />} />
          <Route
            path="/opportunities/real-estate/:id"
            element={<h1>Página simulada: detalle inmobiliario</h1>}
          />
          <Route path="/login" element={<h1>Página simulada: login</h1>} />
          <Route path="/register" element={<h1>Página simulada: registro</h1>} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>,
    );
  }

  it("abre el modal de inicio de sesión si el usuario no está autenticado y permite ir a /login o /register", async () => {
    authState.active_account = null;
    const user = userEvent.setup();
    renderCardWithRoutes();

    await user.click(screen.getByText("Rehabilitación Residencial Eixample"));

    expect(
      await screen.findByText("Inicia sesión para ver los detalles"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/opportunities$/);

    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(await screen.findByRole("heading", { name: "Página simulada: login" })).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/login$/);
  });

  it("redirige a /register al pulsar 'Crear cuenta' en el modal de acceso al detalle", async () => {
    authState.active_account = null;
    const user = userEvent.setup();
    renderCardWithRoutes();

    await user.click(screen.getByText("Rehabilitación Residencial Eixample"));
    await user.click(await screen.findByRole("button", { name: "Crear cuenta" }));

    expect(
      await screen.findByRole("heading", { name: "Página simulada: registro" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/register$/);
  });

  it("navega a /opportunities/real-estate/:id cuando el usuario tiene sesión iniciada", async () => {
    authState.active_account = {
      id: 1,
      email: "sergio@example.com",
      created_at: "2026-10-17T10:00:00Z",
    };
    const user = userEvent.setup();
    renderCardWithRoutes();

    await user.click(screen.getByText("Rehabilitación Residencial Eixample"));

    expect(
      await screen.findByRole("heading", { name: "Página simulada: detalle inmobiliario" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(
      /^\/opportunities\/real-estate\/23$/,
    );
  });

  it("muestra un aviso y no navega si el usuario autenticado pulsa una oportunidad empresarial (equity)", async () => {
    authState.active_account = {
      id: 1,
      email: "sergio@example.com",
      created_at: "2026-10-17T10:00:00Z",
    };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const user = userEvent.setup();

    renderCardWithRoutes({
      ...sampleRealEstateCard,
      id: 44,
      type: "equity",
      title: "Startup EcoLogistics SL",
    });

    await user.click(screen.getByText("Startup EcoLogistics SL"));

    expect(alertSpy).toHaveBeenCalledExactlyOnceWith(
      "Actualmente solo se pueden ver detalles de oportunidades inmobiliarias.",
    );
    expect(screen.getByLabelText("Ruta actual")).toHaveTextContent(/^\/opportunities$/);
    alertSpy.mockRestore();
  });
});