import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, fintechGet, fintechPost } from "../src/service/api";
import { useAuthStore, type RegisteredUser } from "../src/store/useAuthStore";

// Conservem ApiError real, però cap test arriba a la xarxa.
vi.mock("../src/service/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/service/api")>(),
  fintechPost: vi.fn(),
  fintechGet: vi.fn(),
}));

const post = vi.mocked(fintechPost);
const get = vi.mocked(fintechGet);
const credentials = { email: "gerard@example.com", password: "password123" };
const createdUser: RegisteredUser = { id: 1, email: credentials.email, created_at: "2026-10-17T10:00:00Z" };

beforeEach(() => {
  vi.resetAllMocks();
  useAuthStore.setState(useAuthStore.getInitialState(), true);
});

describe("registre de useAuthStore aïllat de l’API", () => {
  it("normalitza el correu, retorna el compte i no inicia sessió", async () => {
    post.mockResolvedValue(createdUser);
    const result = await useAuthStore.getState().register({ email: "  Gerard@Example.COM  ", password: credentials.password });
    expect(post).toHaveBeenCalledExactlyOnceWith("/auth/register", credentials);
    expect(result).toEqual(createdUser);
    expect(useAuthStore.getState()).toMatchObject({
      registrationStatus: "success", registrationDetails: "", active_account: null,
      status: "idle", details: "",
    });
  });

  it("manté loading i evita una segona petició fins que acaba la primera", async () => {
    let resolve!: (user: RegisteredUser) => void;
    post.mockReturnValue(new Promise<RegisteredUser>((done) => { resolve = done; }));
    useAuthStore.setState({ registrationDetails: "Error anterior" });
    const pending = useAuthStore.getState().register(credentials);
    expect(useAuthStore.getState()).toMatchObject({ registrationStatus: "loading", registrationDetails: "" });
    useAuthStore.getState().resetRegistration();
    expect(useAuthStore.getState().registrationStatus).toBe("loading");
    expect(await useAuthStore.getState().register(credentials)).toBeNull();
    expect(post).toHaveBeenCalledOnce();
    resolve(createdUser);
    expect(await pending).toEqual(createdUser);
    expect(useAuthStore.getState().registrationStatus).toBe("success");
  });

  it.each([
    ["409", new ApiError("Conflict", 409, null), "Ya existe una cuenta con este correo electrónico."],
    ["422", new ApiError("Invalid", 422, null), "Revisa el correo y la contraseña."],
    ["500", new ApiError("Server error", 500, null), "No se ha podido crear la cuenta."],
    ["xarxa", new TypeError("Failed to fetch"), "No se ha podido crear la cuenta."],
  ])("retorna null i un missatge comprensible davant un error %s", async (_label, error, message) => {
    post.mockRejectedValue(error);
    expect(await useAuthStore.getState().register(credentials)).toBeNull();
    expect(useAuthStore.getState().registrationStatus).toBe("error");
    expect(useAuthStore.getState().registrationDetails).toContain(message);
    expect(useAuthStore.getState().active_account).toBeNull();
  });

  it("permet reintentar el registre després d’un error", async () => {
    post.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(createdUser);
    await useAuthStore.getState().register(credentials);
    expect(await useAuthStore.getState().register(credentials)).toEqual(createdUser);
    expect(useAuthStore.getState()).toMatchObject({ registrationStatus: "success", registrationDetails: "" });
  });

  it("neteja l’estat del registre sense modificar el del login", () => {
    useAuthStore.setState({ registrationStatus: "error", registrationDetails: "Error anterior", status: "error", details: "Error de login" });
    useAuthStore.getState().resetRegistration();
    expect(useAuthStore.getState()).toMatchObject({ registrationStatus: "idle", registrationDetails: "", status: "error", details: "Error de login" });
  });
});

describe("login de useAuthStore aïllat de l’API", () => {
  const token = { access_token: "token-123", token_type: "bearer" };

  it("normalitza el correu, obté el compte amb el token i inicia sessió", async () => {
    post.mockResolvedValue(token);
    get.mockResolvedValue(createdUser);
    const result = await useAuthStore.getState().login({ email: "  Gerard@Example.COM  ", password: credentials.password });
    expect(post).toHaveBeenCalledExactlyOnceWith("/auth/login", credentials);
    expect(get).toHaveBeenCalledExactlyOnceWith("/auth/me", { headers: { Authorization: "Bearer token-123" } });
    const account = { token: "token-123", ...createdUser };
    expect(result).toEqual(account);
    expect(useAuthStore.getState()).toMatchObject({ status: "success", details: "", active_account: account });
  });

  it.each([
    ["401", new ApiError("Incorrect email or password", 401, null), "El correo o la contraseña no son correctos."],
    ["422", new ApiError("Invalid", 422, null), "Revisa el correo y la contraseña."],
    ["500", new ApiError("Server error", 500, null), "No se ha podido iniciar sesión."],
    ["xarxa", new TypeError("Failed to fetch"), "No se ha podido iniciar sesión."],
  ])("retorna null i un missatge comprensible davant un error %s", async (_label, error, message) => {
    useAuthStore.setState({ active_account: { token: "antic", ...createdUser } });
    post.mockRejectedValue(error);
    expect(await useAuthStore.getState().login(credentials)).toBeNull();
    expect(get).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({ status: "error", active_account: null });
    expect(useAuthStore.getState().details).toContain(message);
  });

  it("no inicia sessió si no es poden obtenir les dades del compte", async () => {
    post.mockResolvedValue(token);
    get.mockRejectedValue(new ApiError("Invalid or missing token", 401, null));
    expect(await useAuthStore.getState().login(credentials)).toBeNull();
    expect(useAuthStore.getState()).toMatchObject({ status: "error", active_account: null });
    expect(useAuthStore.getState().details).toContain("No se ha podido iniciar sesión.");
  });

  it("comença sense cap petició en curs", () => {
    expect(useAuthStore.getState()).toMatchObject({ status: "idle", details: "", active_account: null });
  });

  it("manté loading i evita una segona petició fins que acaba la primera", async () => {
    let resolve!: (value: typeof token) => void;
    post.mockReturnValue(new Promise((done) => { resolve = done; }));
    get.mockResolvedValue(createdUser);
    useAuthStore.setState({ details: "Error anterior" });
    const pending = useAuthStore.getState().login(credentials);
    expect(useAuthStore.getState()).toMatchObject({ status: "loading", details: "" });
    expect(await useAuthStore.getState().login(credentials)).toBeNull();
    expect(post).toHaveBeenCalledOnce();
    resolve(token);
    expect(await pending).toEqual({ token: "token-123", ...createdUser });
    expect(useAuthStore.getState().status).toBe("success");
  });
});
