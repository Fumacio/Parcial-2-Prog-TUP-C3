"use client";
// Hook común de formularios (sección 10.6):
//  - valida con el MISMO esquema de Zod que usa el servidor (errores por campo)
//  - si el servidor responde con errores por campo, también los muestra
//  - maneja el estado "enviando" y avisa el resultado con un toast
import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { ErrorDeApi } from "@/lib/cliente-api";
import { erroresDeZod, type ErrorCampo } from "@/lib/validar";

type Errores = Record<string, string>;

const aMapa = (lista: ErrorCampo[]): Errores =>
  Object.fromEntries(lista.map((e) => [e.campo, e.mensaje]));

export function useFormulario<E extends z.ZodType>(esquema: E) {
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);

  /** Devuelve true si salió bien. */
  async function enviar(
    datos: unknown,
    accion: (validos: z.infer<E>) => Promise<unknown>,
    mensajeExito?: string,
  ): Promise<boolean> {
    // 1. Primero las reglas de Zod, en el navegador
    const resultado = esquema.safeParse(datos);
    if (!resultado.success) {
      setErrores(aMapa(erroresDeZod(resultado.error)));
      return false;
    }
    setErrores({});
    setEnviando(true);
    try {
      // 2. Después el servidor, que vuelve a validar todo
      await accion(resultado.data);
      if (mensajeExito) toast.success(mensajeExito);
      return true;
    } catch (error) {
      if (error instanceof ErrorDeApi) {
        if (Array.isArray(error.details) && error.details[0]?.campo) setErrores(aMapa(error.details));
        toast.error(error.message);
      } else {
        toast.error("Ocurrió un error inesperado.");
      }
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return { errores, enviando, enviar, setErrores };
}
