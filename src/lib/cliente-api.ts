// Ayuda para que los componentes del navegador llamen a la API REST.
// Si la respuesta es un error, lanza ErrorDeApi con el code, message y details del servidor.

export class ErrorDeApi extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Metodo = "GET" | "POST" | "PATCH" | "PUT";

export async function api<T = unknown>(url: string, metodo: Metodo = "GET", cuerpo?: unknown): Promise<T> {
  const respuesta = await fetch(url, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });

  if (respuesta.status === 204) return undefined as T;
  const json = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    if (respuesta.status === 401 && !url.includes("/auth/login")) window.location.href = "/login";
    const e = json?.error ?? {};
    throw new ErrorDeApi(respuesta.status, e.code ?? "ERROR", e.message ?? "Ocurrió un error.", e.details);
  }
  return json as T;
}
