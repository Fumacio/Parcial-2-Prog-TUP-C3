// Única clase de error que lanzan los servicios (sección 10.4).
// El adaptador de la API la convierte en la respuesta JSON estándar (sección 11.1):
//   { "error": { "code": "...", "message": "...", "details": [...] } }

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

// Atajos para los errores más comunes (códigos de la sección 11.8)
export const noEncontrado = (que = "El recurso") =>
  new ApiError(404, "NO_ENCONTRADO", `${que} no existe.`);

export const sinPermiso = () =>
  new ApiError(403, "SIN_PERMISO", "No tenés permiso para realizar esta operación.");

export const noAutenticado = () =>
  new ApiError(401, "NO_AUTENTICADO", "Tenés que iniciar sesión.");

export const reglaNegocio = (code: string, message: string, details?: unknown) =>
  new ApiError(422, code, message, details);

export const conflicto = (code: string, message: string, details?: unknown) =>
  new ApiError(409, code, message, details);
