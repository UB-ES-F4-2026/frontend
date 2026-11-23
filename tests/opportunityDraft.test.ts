import { describe, expect, it } from "vitest";
import {
  buildMetadata,
  EMPTY_FUNDING,
  EMPTY_GENERAL,
  madridLocalToIso,
  validateFunding,
  validateGeneral,
} from "../src/pages/my-opportunities/create/opportunityDraft";

const NOW = Date.parse("2026-11-23T12:00:00Z");
const funding = { target: "150.000", minimum: "100", deadline: "2027-01-31T23:59", initial: "" };

describe("madridLocalToIso", () => {
  it.each([
    // Hivern: UTC+1.
    ["2027-01-31T23:59", "2027-01-31T22:59:00.000Z"],
    // Estiu: UTC+2.
    ["2027-07-01T12:00", "2027-07-01T10:00:00.000Z"],
    // Hora que no existeix el dia del canvi d'hora (de 2:00 es passa a 3:00): queda a les 3:30.
    ["2027-03-28T02:30", "2027-03-28T01:30:00.000Z"],
    ["2027-01-31T23:59:30", "2027-01-31T22:59:30.000Z"],
  ])("interpreta %s en hora de Madrid", (local, iso) => {
    expect(madridLocalToIso(local)).toBe(iso);
  });

  it.each(["", "31/01/2027 23:59", "2027-01-31"])("retorna null per a «%s»", (local) => {
    expect(madridLocalToIso(local)).toBeNull();
  });
});

describe("validateGeneral", () => {
  it("accepta les dades completes", () => {
    const draft = {
      ...EMPTY_GENERAL,
      title: "Local",
      description: "Reforma",
      municipality: "Sabadell",
      province: "Barcelona",
      country: "España",
      images: [new File(["a"], "a.png", { type: "image/png" })],
    };
    expect(validateGeneral(draft)).toEqual({});
  });

  it("limita el títol a 255 caràcters i cada part de la ubicació a 100, com el backend", () => {
    const errors = validateGeneral({ ...EMPTY_GENERAL, title: "a".repeat(256), province: "b".repeat(101) });
    expect(errors.title).toBe("El título no puede superar los 255 caracteres.");
    expect(errors.province).toBe("Máximo 100 caracteres.");
  });
});

describe("validateFunding", () => {
  it("retorna les condicions en cèntims i la data límit en ISO", () => {
    expect(validateFunding({ ...funding, initial: "5.000" }, 800_000, NOW)).toEqual({
      values: {
        targetCents: 15_000_000,
        minimumCents: 10_000,
        deadline: "2027-01-31T22:59:00.000Z",
        initialCents: 500_000,
      },
    });
  });

  it("l'aportació inicial és opcional", () => {
    expect(validateFunding(funding, null, NOW)).toMatchObject({ values: { initialCents: null } });
  });

  it("l'aportació mínima pot ser igual a l'objectiu", () => {
    expect(validateFunding({ ...funding, minimum: "150.000" }, 0, NOW)).toHaveProperty("values");
  });

  it("una aportació inicial igual al saldo disponible és vàlida", () => {
    expect(validateFunding({ ...funding, initial: "8.000" }, 800_000, NOW)).toHaveProperty("values");
  });

  it("no valida l'aportació inicial sense conèixer el saldo", () => {
    expect(validateFunding({ ...funding, initial: "5.000" }, null, NOW)).toEqual({
      errors: { initial: "No se ha podido consultar tu saldo para comprobar la aportación." },
    });
  });

  it("rebutja imports amb més de dos decimals i formats no vàlids", () => {
    const result = validateFunding({ ...EMPTY_FUNDING, target: "10,555", minimum: "1,2,3", deadline: "2027-01-31T23:59" }, 0, NOW);
    expect(result).toEqual({
      errors: {
        target: "El importe no puede tener más de dos decimales.",
        minimum: "Introduce un importe válido, por ejemplo 100,00.",
      },
    });
  });

  it("la data límit ha de ser posterior a l'actual", () => {
    expect(validateFunding({ ...funding, deadline: "2026-11-23T13:00" }, 0, NOW)).toEqual({
      errors: { deadline: "La fecha límite debe ser posterior a la fecha actual." },
    });
  });
});

describe("buildMetadata", () => {
  it("normalitza els textos com el backend i afegeix les dades pròpies del tipus", () => {
    const general = {
      ...EMPTY_GENERAL,
      title: "  Local  ",
      description: " Reforma\n",
      municipality: "  Sant   Cugat del Vallès ",
      province: "Barcelona",
      country: "España",
    };
    const metadata = buildMetadata(
      "equity",
      general,
      { targetCents: 100, minimumCents: 10, deadline: "2027-01-31T22:59:00.000Z", initialCents: null },
      { business: { sector: "technology" } },
    );
    expect(metadata).toEqual({
      type: "equity",
      title: "Local",
      description: "Reforma",
      location: { municipality: "Sant Cugat del Vallès", province: "Barcelona", country: "España" },
      target_amount_cents: 100,
      minimum_contribution_cents: 10,
      deadline: "2027-01-31T22:59:00.000Z",
      initial_contribution_cents: null,
      business: { sector: "technology" },
    });
  });
});
