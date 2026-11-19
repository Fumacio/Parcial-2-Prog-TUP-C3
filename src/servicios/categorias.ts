// Servicio de categorías. RF-P7.
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categorias, productos } from "@/db/schema";
import { conflicto, noEncontrado } from "@/lib/errores";
import { esquemaCategoria, esquemaCategoriaEdicion } from "@/lib/esquemas";
import { exigirAdmin, type Filtros, type Usuario } from "@/lib/tipos";
import { validar } from "@/lib/validar";

/** Todas las categorías activas, sin paginar. Con todas=true (admin) incluye las inactivas. */
export async function listarCategorias(usuario: Usuario, filtros: Filtros = {}) {
  const todas = filtros.todas === "true" && usuario.rol === "admin";
  return db
    .select()
    .from(categorias)
    .where(todas ? undefined : eq(categorias.activa, true))
    .orderBy(asc(categorias.nombre));
}

async function nombreEnUso(nombre: string, excepto?: number) {
  const [otra] = await db.select().from(categorias).where(eq(categorias.nombre, nombre));
  return otra && otra.id !== excepto;
}

/** RF-P7: alta (solo admin). */
export async function crearCategoria(usuario: Usuario, datos: unknown) {
  exigirAdmin(usuario);
  const d = validar(esquemaCategoria, datos);
  if (await nombreEnUso(d.nombre)) throw conflicto("NOMBRE_DUPLICADO", "Ya existe una categoría con ese nombre.");
  const [nueva] = await db.insert(categorias).values(d).returning();
  return nueva;
}

/** RF-P7: edición y baja lógica. No se desactiva si tiene productos activos. */
export async function editarCategoria(usuario: Usuario, id: number, datos: unknown) {
  exigirAdmin(usuario);
  const d = validar(esquemaCategoriaEdicion, datos);

  const [actual] = await db.select().from(categorias).where(eq(categorias.id, id));
  if (!actual) throw noEncontrado("La categoría");
  if (d.nombre && (await nombreEnUso(d.nombre, id))) {
    throw conflicto("NOMBRE_DUPLICADO", "Ya existe una categoría con ese nombre.");
  }
  if (d.activa === false) {
    const enUso = await db.$count(productos, and(eq(productos.categoriaId, id), eq(productos.activo, true)));
    if (enUso > 0) throw conflicto("CATEGORIA_EN_USO", `La categoría tiene ${enUso} productos activos.`);
  }

  const [editada] = await db.update(categorias).set(d).where(eq(categorias.id, id)).returning();
  return editada;
}
