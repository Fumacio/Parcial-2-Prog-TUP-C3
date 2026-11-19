// Ayudas para las páginas (Server Components) que llaman a los servicios.
import { notFound } from "next/navigation";
import { ApiError } from "./errores";
import type { Filtros } from "./tipos";

/** Si el servicio dice 404, muestra la página "no encontrado" de Next. */
export async function oNoEncontrado<T>(promesa: Promise<T>): Promise<T> {
  try {
    return await promesa;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

/** Convierte los searchParams de Next ({ q: "x" } o { q: ["x","y"] }) en Filtros simples. */
export async function leerFiltros(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Filtros> {
  const crudo = await searchParams;
  return Object.fromEntries(
    Object.entries(crudo).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
}

/** Convierte el [id] de la URL a número (o "no encontrado"). */
export function idDePagina(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return n;
}
