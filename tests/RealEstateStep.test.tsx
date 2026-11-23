import { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RealEstateStep from "../src/pages/my-opportunities/create/real-estate/RealEstateStep";
import { EMPTY_REAL_ESTATE, type RealEstateDraft } from "../src/pages/my-opportunities/create/real-estate/realEstateDraft";
import { clickMap, leaflet, pressEnterOnMap } from "./support/reactLeaflet";

vi.mock("react-leaflet", async () => (await import("./support/reactLeaflet")).reactLeafletMock);

// El pas guarda les dades al formulari pare; aquí n'hi fa les veus un estat local.
let current: RealEstateDraft;
function Harness({ initial = EMPTY_REAL_ESTATE }: { initial?: RealEstateDraft }) {
  const [value, setValue] = useState(initial);
  current = value;
  return <RealEstateStep value={value} onChange={setValue} errors={{}} />;
}

const user = () => userEvent.setup({ delay: null });

const choose = async (u: ReturnType<typeof user>, field: RegExp, option: string) => {
  await u.click(screen.getByRole("button", { name: field }));
  await u.click(screen.getByRole("option", { name: option }));
};

const optionsOf = async (u: ReturnType<typeof user>, field: RegExp) => {
  await u.click(screen.getByRole("button", { name: field }));
  const options = screen.getAllByRole("option").map((option) => option.textContent);
  await u.keyboard("{Escape}");
  return options;
};

beforeEach(() => {
  leaflet.handlers = {};
  leaflet.center = { lat: 40.2, lng: -3.7 };
});

describe("pas «Inmueble»: camps", () => {
  it("mostra finalitat, ús previst, tipus d'actiu i superfície, sense camps condicionals", () => {
    render(<Harness />);

    expect(screen.getByRole("button", { name: /Finalidad/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Uso previsto/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tipo de activo/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Superficie (m²)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Viviendas previstas")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Finalización estimada de las obras/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Inicio estimado del alquiler/)).not.toBeInTheDocument();
  });

  it("ofereix les opcions del backend amb els noms en castellà", async () => {
    const u = user();
    render(<Harness />);

    expect(await optionsOf(u, /Finalidad/)).toEqual([
      "Adquisición", "Construcción", "Rehabilitación", "Adquisición y rehabilitación",
    ]);
    expect(await optionsOf(u, /Uso previsto/)).toEqual(["Alquiler", "Venta", "Uso propio"]);
    expect(await optionsOf(u, /Tipo de activo/)).toEqual(["Residencial", "Comercial", "Industrial", "Suelo", "Mixto"]);
  });
});

describe("pas «Inmueble»: camps condicionals", () => {
  it.each([
    ["Residencial", true],
    ["Mixto", true],
    ["Comercial", false],
    ["Industrial", false],
    ["Suelo", false],
  ])("«Viviendas previstas» amb el tipus %s: %s", async (assetType, shown) => {
    const u = user();
    render(<Harness />);

    await choose(u, /Tipo de activo/, assetType);

    if (shown) expect(screen.getByLabelText("Viviendas previstas")).toBeRequired();
    else expect(screen.queryByLabelText("Viviendas previstas")).not.toBeInTheDocument();
  });

  it.each([
    ["Adquisición", false],
    ["Construcción", true],
    ["Rehabilitación", true],
    ["Adquisición y rehabilitación", true],
  ])("«Finalización estimada de las obras» amb la finalitat %s: %s", async (purpose, shown) => {
    const u = user();
    render(<Harness />);

    await choose(u, /Finalidad/, purpose);

    const field = screen.queryByLabelText(/Finalización estimada de las obras/);
    if (shown) expect(field).not.toBeRequired();
    else expect(field).not.toBeInTheDocument();
  });

  it.each([
    ["Alquiler", true],
    ["Venta", false],
    ["Uso propio", false],
  ])("«Inicio estimado del alquiler» amb l'ús %s: %s", async (use, shown) => {
    const u = user();
    render(<Harness />);

    await choose(u, /Uso previsto/, use);

    const field = screen.queryByLabelText(/Inicio estimado del alquiler/);
    if (shown) expect(field).not.toBeRequired();
    else expect(field).not.toBeInTheDocument();
  });

  it("en canviar a un tipus sense viviendas el camp desapareix", async () => {
    const u = user();
    render(<Harness />);
    await choose(u, /Tipo de activo/, "Residencial");
    await u.type(screen.getByLabelText("Viviendas previstas"), "12");

    await choose(u, /Tipo de activo/, "Comercial");

    expect(screen.queryByLabelText("Viviendas previstas")).not.toBeInTheDocument();
  });
});

describe("pas «Inmueble»: ubicació aproximada al mapa", () => {
  it("sense punt marcat mostra la península i no hi ha zona", () => {
    render(<Harness />);

    expect(screen.getByTestId("mapa")).toHaveAttribute("data-center", "40.2,-3.7");
    expect(screen.queryByTestId("zona-marcada")).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: /Ubicación aproximada en el mapa/ })).toHaveAccessibleDescription(
      expect.stringContaining("Haz clic en el mapa para marcar una zona aproximada."),
    );
  });

  it("un clic marca la zona, amb sis decimals com el backend", () => {
    render(<Harness />);

    act(() => clickMap(41.38791712, 2.16991876));

    expect(current.location).toEqual({ latitude: 41.387917, longitude: 2.169919 });
    expect(screen.getByTestId("zona-marcada")).toHaveAttribute("data-center", "41.387917,2.169919");
    expect(screen.getByText("Zona marcada: 41,38792, 2,16992")).toBeInTheDocument();
  });

  it("normalitza la longitud si el mapa s'ha desplaçat més enllà de ±180°", () => {
    render(<Harness />);

    act(() => clickMap(41.5, 362.1));

    expect(current.location).toEqual({ latitude: 41.5, longitude: 2.1 });
  });

  it("amb el teclat, Intro marca el centre del mapa", () => {
    render(<Harness />);
    leaflet.center = { lat: 41.98, lng: 2.82 };

    act(() => pressEnterOnMap());

    expect(current.location).toEqual({ latitude: 41.98, longitude: 2.82 });
  });

  it("«Quitar ubicación» esborra la zona marcada", async () => {
    const u = user();
    render(<Harness initial={{ ...EMPTY_REAL_ESTATE, location: { latitude: 41.5, longitude: 2.1 } }} />);
    expect(screen.getByTestId("mapa")).toHaveAttribute("data-center", "41.5,2.1");

    await u.click(screen.getByRole("button", { name: "Quitar ubicación" }));

    expect(current.location).toBeNull();
    expect(screen.queryByTestId("zona-marcada")).not.toBeInTheDocument();
  });
});
