// Valida datos con un esquema de Zod. Si algo está mal lanza ApiError 422 VALIDACION
// con el detalle por campo: [{ campo: "codigo", mensaje: "Es obligatorio." }]
import type { z } from "zod";
import { ApiError } from "./errores";

export type ErrorCampo = { campo: string; mensaje: string };

export function erroresDeZod(error: z.ZodError): ErrorCampo[] {
  const lista: ErrorCampo[] = [];
  for (const issue of error.issues) {
    if (issue.code === "unrecognized_keys") {
      // Campo no previsto, por ejemplo "existencia" en un PATCH o el número completo de tarjeta
      for (const key of issue.keys) {
        lista.push({ campo: [...issue.path, key].join("."), mensaje: "Campo no permitido." });
      }
    } else {
      lista.push({ campo: issue.path.join("."), mensaje: issue.message });
    }
  }
  return lista;
}

export function validar<T extends z.ZodType>(esquema: T, datos: unknown): z.infer<T> {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) {
    throw new ApiError(422, "VALIDACION", "Hay campos con errores.", erroresDeZod(resultado.error));
  }
  return resultado.data;
}
