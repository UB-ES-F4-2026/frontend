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

// Envolvemos en MemoryRouter porque OpportunityCard podría usar enlaces internamente en el futuro,
// y para mantener la consistencia con el resto de tests.
const page = () => (
  <MemoryRouter>
    <Opportunities />
  </MemoryRouter>
);

function renderOpportunities() {
  return render(page());
}

// --- Simulación de la búsqueda difusa del backend -------------------------------------------
// El componente no calcula distancias: delega en el backend vía fetchOpportunities(term).
// Para probar la UI con datos realistas simulamos esa regla: un nombre es válido si su
// distancia de Levenshtein respecto al término buscado es <= 3.
const MAX_LEVENSHTEIN_DISTANCE = 3;

const levenshtein = (a: string, b: string) => {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
};

const matchesName = (title: string, term: string) =>
  levenshtein(title.toLowerCase(), term.toLowerCase()) <= MAX_LEVENSHTEIN_DISTANCE;

const EDIFICIO = buildOpportunity({
  id: 1,
  type: "real_estate",
  title: "Edificio Histórico L'Eixample",
  location: "Barcelona",
});

const STARTUP = buildOpportunity({
  id: 2,
  type: "equity",
  title: "Startup EcoLogistics SL",
  location: "Valencia",
});

// Distancia exacta respecto a "Startup EcoLogistics SL"
const TERM_DISTANCE_3 = "Startp EcoLogistcs S"; // 3 borrados: u, i, L
const TERM_DISTANCE_4 = "Startp EcoLogstcs S"; // 4 borrados: u, i, i, L

// Sustituye fetchOpportunities por un "backend" que filtra el catálogo según el término.
const installFakeBackend = (catalog: ReturnType<typeof buildOpportunity>[]) => {
  state.status = "success";
  state.opportunities = catalog;
  state.fetchOpportunities.mockImplementation((term?: string | null) => {
    state.status = "success";
    state.opportunities = term
      ? catalog.filter((item) => matchesName(item.title, term))
      : catalog;
  });
};

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

      expect(screen.getByText("Inmobiliaria")).toBeInTheDocument();
      expect(screen.getByText("Empresarial")).toBeInTheDocument();
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

  describe("mensaje cuando no hay resultados (fallback)", () => {
    const NO_PUBLISHED = "¡Aún no hay oportunidades publicadas!";
    const NO_SEARCH_MATCH =
      "No se encontraron oportunidades que coincidan con los criterios de búsqueda.";

    it("sin haber buscado, muestra el mensaje de 'no hay oportunidades publicadas'", () => {
      state.status = "success";
      state.opportunities = [];
      renderOpportunities();

      expect(screen.getByText(NO_PUBLISHED)).toBeInTheDocument();
      expect(screen.queryByText(NO_SEARCH_MATCH)).not.toBeInTheDocument();
    });

    it("tras buscar un término sin resultados, muestra el mensaje de búsqueda sin coincidencias", async () => {
      const user = userEvent.setup();
      state.status = "success";
      state.opportunities = [];
      renderOpportunities();

      await user.type(getSearchInput(), "Zzzzzzzzzz");
      await user.click(getSearchButton());

      expect(state.fetchOpportunities).toHaveBeenLastCalledWith("Zzzzzzzzzz");
      expect(screen.getByText(NO_SEARCH_MATCH)).toBeInTheDocument();
      expect(screen.queryByText(NO_PUBLISHED)).not.toBeInTheDocument();
    });

    it("también muestra el mensaje de búsqueda sin coincidencias al buscar con Enter", async () => {
      const user = userEvent.setup();
      state.status = "success";
      state.opportunities = [];
      renderOpportunities();

      await user.type(getSearchInput(), "Zzzzzzzzzz{Enter}");

      expect(screen.getByText(NO_SEARCH_MATCH)).toBeInTheDocument();
      expect(screen.queryByText(NO_PUBLISHED)).not.toBeInTheDocument();
    });

    it("buscar con el campo vacío NO activa el mensaje de búsqueda sin coincidencias", async () => {
      const user = userEvent.setup();
      state.status = "success";
      state.opportunities = [];
      renderOpportunities();

      await user.click(getSearchButton());

      expect(state.fetchOpportunities).toHaveBeenLastCalledWith("");
      expect(screen.getByText(NO_PUBLISHED)).toBeInTheDocument();
      expect(screen.queryByText(NO_SEARCH_MATCH)).not.toBeInTheDocument();
    });

    it("ningún mensaje de fallback se muestra si hay oportunidades", async () => {
      const user = userEvent.setup();
      state.status = "success";
      state.opportunities = [EDIFICIO];
      renderOpportunities();

      await user.type(getSearchInput(), "Edificio");
      await user.click(getSearchButton());

      expect(screen.queryByText(NO_PUBLISHED)).not.toBeInTheDocument();
      expect(screen.queryByText(NO_SEARCH_MATCH)).not.toBeInTheDocument();
    });

    it("tras una búsqueda, el estado 'error' muestra el error y no el fallback", async () => {
      const user = userEvent.setup();
      state.status = "success";
      state.opportunities = [];
      const view = renderOpportunities();

      await user.type(getSearchInput(), "Zzzzzzzzzz");
      await user.click(getSearchButton());
      expect(screen.getByText(NO_SEARCH_MATCH)).toBeInTheDocument();

      state.status = "error";
      state.details = "Error de conexión con el servidor.";
      view.rerender(page());

      expect(
        screen.getByText("Error de conexión con el servidor."),
      ).toBeInTheDocument();
      expect(screen.queryByText(NO_SEARCH_MATCH)).not.toBeInTheDocument();
      expect(screen.queryByText(NO_PUBLISHED)).not.toBeInTheDocument();
    });

    it.todo(
      "tras una búsqueda sin resultados, al limpiar el campo y recargar el listado vacío vuelve a mostrarse 'no hay oportunidades publicadas'",
    );
  });

  describe("contador de oportunidades encontradas", () => {
    it("muestra 0 cuando no hay oportunidades", () => {
      state.status = "success";
      state.opportunities = [];
      renderOpportunities();

      expect(screen.getByText("0 oportunidades encontradas")).toBeInTheDocument();
    });

    it("muestra el número de oportunidades del listado", () => {
      state.status = "success";
      state.opportunities = [EDIFICIO, STARTUP];
      renderOpportunities();

      expect(screen.getByText("2 oportunidades encontradas")).toBeInTheDocument();
    });

    it("con una sola oportunidad muestra el contador con valor 1", () => {
      state.status = "success";
      state.opportunities = [EDIFICIO];
      renderOpportunities();

      // Admite tanto "1 oportunidades encontradas" como la versión en singular.
      expect(
        screen.getByText(/^1 oportunidad(es)? encontrad(a|as)$/),
      ).toBeInTheDocument();
    });

    it("el contador se mantiene visible mientras se carga", () => {
      state.status = "loading";
      renderOpportunities();

      expect(screen.getByTestId("opportunities-skeleton")).toBeInTheDocument();
      expect(screen.getByText("0 oportunidades encontradas")).toBeInTheDocument();
    });
  });

  describe("búsqueda por nombre con tolerancia (distancia de Levenshtein <= 3)", () => {
    it("los términos de prueba tienen la distancia esperada", () => {
      expect(levenshtein("Startup EcoLogistics SL", TERM_DISTANCE_3)).toBe(3);
      expect(levenshtein("Startup EcoLogistics SL", TERM_DISTANCE_4)).toBe(4);
    });

    it("un término a distancia 0 (nombre exacto) devuelve la oportunidad", async () => {
      const user = userEvent.setup();
      installFakeBackend([EDIFICIO, STARTUP]);
      const view = renderOpportunities();

      await user.type(getSearchInput(), "Startup EcoLogistics SL");
      await user.click(getSearchButton());
      view.rerender(page());

      expect(screen.getByText("Startup EcoLogistics SL")).toBeInTheDocument();
      expect(
        screen.queryByText("Edificio Histórico L'Eixample"),
      ).not.toBeInTheDocument();
    });

    it("un término a distancia 3 se considera válido y muestra la oportunidad", async () => {
      const user = userEvent.setup();
      installFakeBackend([EDIFICIO, STARTUP]);
      const view = renderOpportunities();

      // Antes de buscar se ven ambas
      expect(screen.getByText("2 oportunidades encontradas")).toBeInTheDocument();

      await user.type(getSearchInput(), TERM_DISTANCE_3);
      await user.click(getSearchButton());
      view.rerender(page());

      expect(state.fetchOpportunities).toHaveBeenLastCalledWith(TERM_DISTANCE_3);
      expect(screen.getByText("Startup EcoLogistics SL")).toBeInTheDocument();
      expect(
        screen.queryByText("Edificio Histórico L'Eixample"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText(/^1 oportunidad(es)? encontrad(a|as)$/),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/No se encontraron oportunidades/),
      ).not.toBeInTheDocument();
    });

    it("un término a distancia 4 NO es válido y muestra el mensaje de búsqueda sin coincidencias", async () => {
      const user = userEvent.setup();
      installFakeBackend([EDIFICIO, STARTUP]);
      const view = renderOpportunities();

      await user.type(getSearchInput(), TERM_DISTANCE_4);
      await user.click(getSearchButton());
      view.rerender(page());

      expect(state.fetchOpportunities).toHaveBeenLastCalledWith(TERM_DISTANCE_4);
      expect(screen.queryByText("Startup EcoLogistics SL")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Edificio Histórico L'Eixample"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("0 oportunidades encontradas")).toBeInTheDocument();
      expect(
        screen.getByText(
          "No se encontraron oportunidades que coincidan con los criterios de búsqueda.",
        ),
      ).toBeInTheDocument();
    });

    it("la búsqueda no distingue mayúsculas de minúsculas", async () => {
      const user = userEvent.setup();
      installFakeBackend([EDIFICIO, STARTUP]);
      const view = renderOpportunities();

      await user.type(getSearchInput(), "STARTUP ECOLOGISTICS SL");
      await user.click(getSearchButton());
      view.rerender(page());

      expect(screen.getByText("Startup EcoLogistics SL")).toBeInTheDocument();
    });
  });
});