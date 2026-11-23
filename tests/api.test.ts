import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fintechDel,
  fintechGet,
  fintechPatch,
  fintechPost,
  fintechPut,
  SESSION_EXPIRED,
} from "../src/service/api";

const fetchMock = vi.fn();

function response(body: unknown, status = 200, contentType = "application/json"): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": contentType },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("servei HTTP", () => {
  it("construeix una consulta GET relativa, sense paràmetres nuls i amb cookie", async () => {
    fetchMock.mockResolvedValueOnce(response({ id: 1 }));

    await expect(fintechGet<{ id: number }>("opportunities", {
      params: { name: "Girona", page: 2, archived: null },
    })).resolves.toEqual({ id: 1 });

    expect(fetchMock).toHaveBeenCalledWith("/api/opportunities?name=Girona&page=2", expect.objectContaining({
      method: "GET",
      credentials: "include",
    }));
  });

  it("serialitza JSON, conserva FormData i exposa els verbs mutadors", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(response(undefined, 204))
      .mockResolvedValueOnce(response(undefined, 204))
      .mockResolvedValueOnce(response(undefined, 204));
    const form = new FormData();
    form.set("file", "content");

    await fintechPost("/opportunities", { title: "Girona" });
    await fintechPut("/opportunities/1", form);
    await fintechPatch("/opportunities/1", { title: "Nou títol" });
    await fintechDel("/opportunities/1");

    const [, postOptions] = fetchMock.mock.calls[0];
    expect(postOptions.headers.get("Content-Type")).toBe("application/json");
    expect(postOptions.body).toBe(JSON.stringify({ title: "Girona" }));
    const [, putOptions] = fetchMock.mock.calls[1];
    expect(putOptions.body).toBe(form);
    expect(putOptions.headers.get("Content-Type")).toBeNull();
    expect(fetchMock.mock.calls.map(([, options]) => options.method)).toEqual(["POST", "PUT", "PATCH", "DELETE"]);
  });

  it("normalitza els errors HTTP i emet una sessió caducada fora del login", async () => {
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED, expired);
    fetchMock.mockResolvedValueOnce(response({ detail: "Invalid or missing session" }, 401));

    await expect(fintechGet("/me/wallet")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Invalid or missing session",
    });

    expect(expired).toHaveBeenCalledOnce();
    window.removeEventListener(SESSION_EXPIRED, expired);
  });

  it("no tracta un 401 de login com una sessió caducada", async () => {
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED, expired);
    fetchMock.mockResolvedValueOnce(response("Unauthorized", 401, "text/plain"));

    await expect(fintechPost("/auth/login", { email: "ada@example.com" })).rejects.toMatchObject({
      message: "HTTP Error 401",
      status: 401,
    });

    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener(SESSION_EXPIRED, expired);
  });
});
