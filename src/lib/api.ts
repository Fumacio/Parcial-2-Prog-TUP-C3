// Envoltorio común de las rutas de la API (sección 10.3).
// Hace lo que se repite en las 31 rutas, para que cada route.ts quede en pocas líneas:
//   1. exige la sesión (401 si no hay)
//   2. resuelve los parámetros de la ruta ([id]) y de la URL (?q=...)
//   3. lee el JSON del cuerpo (400 si no es JSON válido)
//   4. llama a la función (que llama a un servicio) y responde
//   5. convierte cualquier error al formato estándar { error: { code, message, details } }
import { ApiError, noAutenticado, noEncontrado } from "./errores";
import { usuarioActual } from "./sesion";
import type { Filtros, Usuario } from "./tipos";

type Contexto = {
  usuario: Usuario;
  params: Record<string, string>;
  query: Filtros;
  body: unknown;
};

type Opciones = { publica?: boolean; status?: number };

export function ruta(
  manejador: (ctx: Contexto) => Promise<unknown>,
  opciones: Opciones = {},
) {
  return async (request: Request, contexto: { params: Promise<Record<string, string>> }) => {
    try {
      const usuario = await usuarioActual();
      if (!usuario && !opciones.publica) throw noAutenticado();

      const params = (await contexto.params) ?? {};
      const query = Object.fromEntries(new URL(request.url).searchParams);

      let body: unknown = undefined;
      if (request.method !== "GET") {
        const texto = await request.text();
        if (texto) {
          try {
            body = JSON.parse(texto);
          } catch {
            throw new ApiError(400, "JSON_INVALIDO", "El cuerpo no es JSON válido.");
          }
        }
      }

      const resultado = await manejador({ usuario: usuario!, params, query, body });
      if (resultado === undefined) return new Response(null, { status: 204 });
      return Response.json(resultado, { status: opciones.status ?? 200 });
    } catch (error) {
      return respuestaDeError(error);
    }
  };
}

/** Arma la respuesta de error. Un error inesperado se registra pero su detalle NO se envía. */
export function respuestaDeError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } },
      { status: error.status },
    );
  }
  console.error(error);
  return Response.json(
    { error: { code: "ERROR_INTERNO", message: "Ocurrió un error inesperado." } },
    { status: 500 },
  );
}

/** Convierte el [id] de la URL a número (404 si no es un número). */
export function idDe(params: Record<string, string>) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) throw noEncontrado();
  return id;
}
