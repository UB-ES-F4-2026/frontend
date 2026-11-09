import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Opportunities from "../src/pages/opportunities/Opportunities";

// Aislamos el componente del store simulando su estado
const state = vi.hoisted(() => ({
  status: "idle",
  details: "",
  opportunities: [] as any[],
  fetchOpportunities: vi.fn(),
}));

vi.mock("../src/store/useOpportunityStore", () => ({
  useOpportunityStore: (selector?: (value: typeof state) => unknown) =>
    selector ? selector(state) : state,
}));

const DAY_MS = 86_400_000;

// Las fechas se calculan en relación a "ahora" para que los tests no caduquen con el tiempo.
const inDays = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

const buildOpportunity = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  user_id: null,
  type: "real_estate",
  title: "Edificio Histórico L'Eixample",
  description: "Rehabilitación de un edificio histórico.",
  location: "Barcelona",
  cover_image_url: null,
  target_amount_cents: 150_000_000,
  committed_cents: 50_000_000,
  deadline: inDays(10),
  date_published: null,
  date_closed: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

function renderOpportunities() {
  // Envolvemos en MemoryRouter porque OpportunityCard podría usar enlaces internamente en el futuro,
  // y para mantener la consistencia con el resto de tests.
  return render(
    <MemoryRouter>
      <Opportunities />
    </MemoryRouter>,
  );
}

const getSearchInput = () =>
  screen.getByPlaceholderText("Buscar oportunidades...") as HTMLInputElement;

const getSearchButton = () => screen.getByRole("button", { name: "Buscar" });

beforeEach(() => {
  vi.resetAllMocks();
  state.status = "idle";
  state.details = "";
  state.opportunities = [];
});

describe("Opportunities", () => {
  describe("cabecera", () => {
    it("muestra el título y la descripción de la página", () => {
      renderOpportunities();

      expect(
        screen.getByRole("heading", { level: 1, name: "Oportunidades" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Explora proyectos de inversión colectiva en fase de financiación.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("carga inicial", () => {
    it("llama a fetchOpportunities al montarse el componente, sin término de búsqueda", () => {
      renderOpportunities();

      expect(state.fetchOpportunities).toHaveBeenCalledOnce();
      expect(state.fetchOpportunities).toHaveBeenCalledWith();
    });
  });

  describe("estados de la petición", () => {
    it("muestra el skeleton cuando el estado es 'loading'", () => {
      state.status = "loading";
      renderOpportunities();

      expect(screen.getByTestId("opportunities-skeleton")).toBeInTheDocument();
      expect(screen.queryByText("Reintentar")).not.toBeInTheDocument();
      expect(
        screen.queryByText("¡Aún no hay oportunidades publicadas!"),
      ).not.toBeInTheDocument();
    });

    it("muestra el mensaje de error y permite reintentar la petición", async () => {
      state.status = "error";
      state.details = "Error de conexión con el servidor.";
      renderOpportunities();

      expect(
        screen.getByText("Error de conexión con el servidor."),
      ).toBeInTheDocument();

      const retryButton = screen.getByRole("button", { name: "Reintentar" });
      expect(retryButton).toBeInTheDocument();

      const user = userEvent.setup();
      await user.click(retryButton);

      // fetchOpportunities debe haberse llamado al montar (1) y al hacer clic (2)
      expect(state.fetchOpportunities).toHaveBeenCalledTimes(2);
      // El reintento recarga el listado completo, sin término de búsqueda
      expect(state.fetchOpportunities).toHaveBeenLastCalledWith();
      expect(
        screen.queryByTestId("opportunities-skeleton"),
      ).not.toBeInTheDocument();
    });

    it("muestra un mensaje alternativo cuando no hay oportunidades publicadas", () => {
      state.status = "success";
      state.opportunities = [];
      renderOpportunities();

      expect(
        screen.getByText("¡Aún no hay oportunidades publicadas!"),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("opportunities-skeleton"),
      ).not.toBeInTheDocument();
    });

    it("no muestra listado, error ni skeleton cuando el estado es 'idle'", () => {
      state.status = "idle";
      renderOpportunities();

      expect(
        screen.queryByTestId("opportunities-skeleton"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Reintentar")).not.toBeInTheDocument();
      expect(
        screen.queryByText("¡Aún no hay oportunidades publicadas!"),
      ).not.toBeInTheDocument();
    });
  });

  describe("listado de oportunidades", () => {
    it("renderiza la lista de tarjetas de oportunidades cuando la petición tiene éxito", () => {
      state.status = "success";
      state.opportunities = [
        buildOpportunity({
          id: 1,
          type: "real_estate",
          title: "Edificio Histórico L'Eixample",
          location: "Barcelona",
        }),
        buildOpportunity({
          id: 2,
          type: "equity",
          title: "Startup EcoLogistics SL",
          location: "Valencia",
          target_amount_cents: 40_000_000,
          committed_cents: 40_000_000,
        }),
      ];
      renderOpportunities();

      // Títulos
      expect(
        screen.getByText("Edificio Histórico L'Eixample"),
      ).toBeInTheDocument();
      expect(screen.getByText("Startup EcoLogistics SL")).toBeInTheDocument();

      // Información anidada para asegurar que cada Card recibe los datos correctamente
      expect(screen.getByText("Barcelona")).toBeInTheDocument();
      expect(screen.getByText("Valencia")).toBeInTheDocument();

      // Una tarjeta por oportunidad
      expect(screen.getAllByText("Capital comprometido")).toHaveLength(2);
    });

    it("muestra la etiqueta de tipo correcta en cada tarjeta", () => {
      state.status = "success";
      state.opportunities = [
        buildOpportunity({ id: 1, type: "real_estate" }),
        buildOpportunity({ id: 2, type: "equity", title: "Otra startup" }),
      ];
      renderOpportunities();

      expect(screen.getByText("Inmobiliario")).toBeInTheDocument();
      expect(screen.getByText("Startup")).toBeInTheDocument();
    });

    it("muestra el progreso de financiación y los días restantes", () => {
      state.status = "success";
      state.opportunities = [buildOpportunity({ deadline: inDays(10) })];
      renderOpportunities();

      // 50.000.000 / 150.000.000 = 33,3 %
      expect(screen.getByText(/33,3\s*%/)).toBeInTheDocument();
      expect(screen.getByText("10 días restantes")).toBeInTheDocument();
      expect(screen.getByText("En financiación")).toBeInTheDocument();
    });

    it("marca la oportunidad como 'Plazo finalizado' si la fecha límite ya ha pasado", () => {
      state.status = "success";
      state.opportunities = [buildOpportunity({ deadline: inDays(-3) })];
      renderOpportunities();

      expect(screen.getByText("Plazo finalizado")).toBeInTheDocument();
      expect(screen.getByText("0 días restantes")).toBeInTheDocument();
      expect(screen.queryByText("En financiación")).not.toBeInTheDocument();
    });

    it("marca la oportunidad como 'Plazo finalizado' si tiene fecha de cierre", () => {
      state.status = "success";
      state.opportunities = [
        buildOpportunity({
          deadline: inDays(10),
          date_closed: "2026-01-02T00:00:00.000Z",
        }),
      ];
      renderOpportunities();

      expect(screen.getByText("Plazo finalizado")).toBeInTheDocument();
      expect(screen.queryByText("En financiación")).not.toBeInTheDocument();
    });

    it("limita la barra de progreso al 100 % pero muestra el porcentaje real", () => {
      state.status = "success";
      state.opportunities = [
        buildOpportunity({
          target_amount_cents: 10_000_000,
          committed_cents: 15_000_000,
        }),
      ];
      renderOpportunities();

      expect(screen.getByText(/150,0\s*%/)).toBeInTheDocument();
    });

    it("muestra la imagen de portada cuando existe", () => {
      state.status = "success";
      state.opportunities = [
        buildOpportunity({ cover_image_url: "https://example.com/portada.jpg" }),
      ];
      renderOpportunities();

      const image = screen.getByRole("img", {
        name: "Edificio Histórico L'Eixample",
      });
      expect(image).toHaveAttribute("src", "https://example.com/portada.jpg");
      expect(screen.queryByText("Imagen no disponible")).not.toBeInTheDocument();
    });

    it("muestra un texto alternativo cuando no hay imagen de portada", () => {
      state.status = "success";
      state.opportunities = [buildOpportunity({ cover_image_url: null })];
      renderOpportunities();

      expect(screen.getByText("Imagen no disponible")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("buscador", () => {
    it("renderiza el buscador con su etiqueta, campo, botón y texto de ayuda", () => {
      renderOpportunities();

      expect(screen.getByText("Buscar por nombre")).toBeInTheDocument();
      expect(getSearchInput()).toBeInTheDocument();
      expect(getSearchButton()).toBeInTheDocument();
      expect(
        screen.getByText("Busca por el nombre completo o por una parte"),
      ).toBeInTheDocument();
    });

    it("el campo de búsqueda está asociado a su etiqueta", () => {
      renderOpportunities();

      expect(screen.getByLabelText("Buscar por nombre")).toBe(getSearchInput());
    });

    it("el campo de búsqueda empieza vacío", () => {
      renderOpportunities();

      expect(getSearchInput()).toHaveValue("");
    });

    it("escribir en el campo no lanza ninguna búsqueda hasta pulsar el botón", async () => {
      const user = userEvent.setup();
      renderOpportunities();

      await user.type(getSearchInput(), "Edificio");

      expect(getSearchInput()).toHaveValue("Edificio");
      // Solo la carga inicial
      expect(state.fetchOpportunities).toHaveBeenCalledOnce();
    });

    it("al pulsar 'Buscar' llama a fetchOpportunities con el término escrito", async () => {
      const user = userEvent.setup();
      renderOpportunities();

      await user.type(getSearchInput(), "Edificio");
      await user.click(getSearchButton());

      // Carga inicial (1) + búsqueda (2)
      expect(state.fetchOpportunities).toHaveBeenCalledTimes(2);
      expect(state.fetchOpportunities).toHaveBeenLastCalledWith("Edificio");
    });

    it("al pulsar 'Buscar' NO se borra el contenido del campo", async () => {
      const user = userEvent.setup();
      renderOpportunities();

      await user.type(getSearchInput(), "Edificio");
      await user.click(getSearchButton());

      expect(getSearchInput()).toHaveValue("Edificio");
    });

    it("al pulsar Enter en el campo lanza la búsqueda con el término escrito", async () => {
      const user = userEvent.setup();
      renderOpportunities();

      await user.type(getSearchInput(), "Startup{Enter}");

      expect(state.fetchOpportunities).toHaveBeenCalledTimes(2);
      expect(state.fetchOpportunities).toHaveBeenLastCalledWith("Startup");
      expect(getSearchInput()).toHaveValue("Startup");
    });

    it("al pulsar 'Buscar' con el campo vacío busca con cadena vacía", async () => {
      const user = userEvent.setup();
      renderOpportunities();

      await user.click(getSearchButton());

      expect(state.fetchOpportunities).toHaveBeenCalledTimes(2);
      expect(state.fetchOpportunities).toHaveBeenLastCalledWith("");
    });

    it("permite lanzar varias búsquedas consecutivas con términos distintos", async () => {
      const user = userEvent.setup();
      renderOpportunities();

      await user.type(getSearchInput(), "Edificio");
      await user.click(getSearchButton());
      expect(state.fetchOpportunities).toHaveBeenLastCalledWith("Edificio");

      await user.clear(getSearchInput());
      await user.type(getSearchInput(), "Startup");
      await user.click(getSearchButton());
      expect(state.fetchOpportunities).toHaveBeenLastCalledWith("Startup");
    });

    it("al limpiar el campo (Escape) se recarga el listado completo", async () => {
      const user = userEvent.setup();
      renderOpportunities();

      await user.type(getSearchInput(), "Edificio");
      await user.keyboard("{Escape}");

      expect(getSearchInput()).toHaveValue("");
      expect(state.fetchOpportunities).toHaveBeenLastCalledWith("");
    });

    it("el buscador sigue visible mientras se cargan las oportunidades", () => {
      state.status = "loading";
      renderOpportunities();

      expect(screen.getByTestId("opportunities-skeleton")).toBeInTheDocument();
      expect(getSearchInput()).toBeInTheDocument();
      expect(getSearchButton()).toBeInTheDocument();
    });

    it("el buscador sigue visible cuando hay un error", () => {
      state.status = "error";
      state.details = "Error de conexión con el servidor.";
      renderOpportunities();

      expect(getSearchInput()).toBeInTheDocument();
      expect(getSearchButton()).toBeInTheDocument();
    });

    it("el buscador sigue visible cuando no hay resultados", () => {
      state.status = "success";
      state.opportunities = [];
      renderOpportunities();

      expect(getSearchInput()).toBeInTheDocument();
      expect(getSearchButton()).toBeInTheDocument();
    });
  });
});