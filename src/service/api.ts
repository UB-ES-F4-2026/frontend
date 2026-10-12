const API_BASE_URL = "/api";

export type RequestStatus = "loading" | "success" | "error";

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface RequestOptions {
  params?: QueryParams;
  headers?: HeadersInit;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const buildUrl = (path: string, params?: QueryParams): string => {
  const url = new URL(
    `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`,
    window.location.origin,
  );

  for (const [k, v] of Object.entries(params ?? {})) {
    if (v) url.searchParams.set(k, String(v));
  }

  return `${url.pathname}${url.search}`;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  let requestBody: BodyInit | undefined;

  if (body !== undefined) {
    if (body instanceof FormData) {
      requestBody = body;
    } else if (typeof body === "string") {
      requestBody = body;
    } else {
      headers.set("Content-Type", "Application/json");
      requestBody = JSON.stringify(body);
    }
  }

  const response = await fetch(buildUrl(path, options.params), {
    method,
    headers,
    body: requestBody,
    signal: options.signal,
    credentials: "same-origin",
  });

  const contentType = response.headers.get("content-type") ?? "";
  let data: unknown;

  if (response.status !== 204 && response.status !== 205) {
    if (contentType.includes("json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  }
  if (!response.ok) {
    const errorMessage =
      typeof data === "object" && data !== null && "detail" in data && typeof data.detail === "string"
        ? data.detail
        : typeof data === "object" && data !== null && "message" in data && typeof data.message === "string"
          ? data.message
          : `Error HTTP ${response.status}`;

    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

export function fintechGet<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>("GET", path, undefined, options);
}

export function fintechPost<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("POST", path, body, options);
}

export function fintechPut<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("PUT", path, body, options);
}

export function fintechPatch<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("PATCH", path, body, options);
}

export function fintechDel<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>("DELETE", path, undefined, options);
}
