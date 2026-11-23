import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fintechGet } from "../src/service/api";
import { useHealthStore } from "../src/store/useHealthStore";

vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechGet: vi.fn(),
}));

const get = vi.mocked(fintechGet);

beforeEach(() => {
  vi.resetAllMocks();
  useHealthStore.setState(useHealthStore.getInitialState(), true);
});

describe("useHealthStore aïllat de l'API", () => {
  it("interpreta una resposta sana del backend i la base de dades", async () => {
    get.mockResolvedValue({ status: "ok", service: "backend", database: "ok" });

    await useHealthStore.getState().checkConnection();

    expect(get).toHaveBeenCalledWith("/health", expect.objectContaining({
      signal: expect.any(AbortSignal),
    }));
    expect(useHealthStore.getState()).toMatchObject({
      status: "success",
      details: "",
      service: "backend",
      database_ok: true,
      general_status_ok: true,
    });
  });

  it("manté l'estat de salut separat si el backend respon sense base de dades", async () => {
    get.mockResolvedValue({ status: "ok", service: "backend", database: "error" });

    await useHealthStore.getState().checkConnection();

    expect(useHealthStore.getState()).toMatchObject({
      status: "success",
      database_ok: false,
      general_status_ok: true,
    });
  });

  it.each([
    [new ApiError("Unavailable", 503, null), "Unavailable (HTTP 503)"],
    [new TypeError("Failed to fetch"), "Failed to fetch"],
  ])("restableix les dades i mostra un error segur", async (error, details) => {
    useHealthStore.setState({ database_ok: true, service: "old", general_status_ok: true });
    get.mockRejectedValue(error);

    await useHealthStore.getState().checkConnection();

    expect(useHealthStore.getState()).toMatchObject({
      status: "error",
      details,
      database_ok: false,
      service: "",
      general_status_ok: false,
    });
  });
});
