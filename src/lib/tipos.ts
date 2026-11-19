// Tipos compartidos y ayudas chicas que usan todos los servicios.
import { sinPermiso } from "./errores";

/** Usuario autenticado. Los servicios lo reciben como primer parámetro. */
export type Usuario = {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
};

/** Respuesta paginada (sección 11.1) */
export type Pagina<T> = { data: T[]; page: number; pageSize: number; total: number };

/** Parámetros de búsqueda tal como llegan de la URL (?q=...&page=2) */
export type Filtros = Record<string, string | undefined>;

/** Verifica el rol. Ocultar el botón no alcanza: el permiso lo decide el servicio (10.5). */
export function exigirAdmin(usuario: Usuario) {
  if (usuario.rol !== "admin") throw sinPermiso();
}

/** Lee page y pageSize (por defecto 20, máximo 100) */
export function paginacion(filtros: Filtros) {
  const page = Math.max(1, Number(filtros.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filtros.pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/** Quita puntos, guiones y espacios: "28.456.123" -> "28456123" */
export function soloDigitos(texto: string) {
  return texto.replace(/[^\d]/g, "");
}
