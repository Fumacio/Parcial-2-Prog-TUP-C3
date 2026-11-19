// Servicio de productos. RF-P1, RF-P2, RF-P3.
import { and, asc, eq, like, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categorias, productos } from "@/db/schema";
import { conflicto, noEncontrado, reglaNegocio } from "@/lib/errores";
import { esquemaProductoAlta, esquemaProductoEdicion } from "@/lib/esquemas";
import { exigirAdmin, paginacion, type Filtros, type Usuario } from "@/lib/tipos";
import { validar } from "@/lib/validar";
import { moverStock } from "./stock";

// Consulta base: producto + su categoría
function consultaProductos() {
  return db
    .select({ p: productos, categoria: { id: categorias.id, nombre: categorias.nombre } })
    .from(productos)
    .innerJoin(categorias, eq(categorias.id, productos.categoriaId));
}

// Forma pública del producto (sección 11.4)
function formatoProducto(fila: { p: typeof productos.$inferSelect; categoria: { id: number; nombre: string } }) {
  const { p, categoria } = fila;
  return {
    id: p.id,
    codigo: p.codigo,
    descripcion: p.descripcion,
    categoria,
    precio: p.precio,
    existencia: p.existencia,
    stockMinimo: p.stockMinimo,
    bajoMinimo: p.existencia < p.stockMinimo,
    activo: p.activo,
  };
}
export type Producto = ReturnType<typeof formatoProducto>;

/** RF-P1: catálogo paginado con búsqueda, filtro por categoría y bajo mínimo. */
export async function listarProductos(usuario: Usuario, filtros: Filtros) {
  const { page, pageSize, offset } = paginacion(filtros);

  const condiciones: SQL[] = [];
  // Por defecto solo activos. El admin puede pedir activo=todos o activo=false (las bajas).
  const esAdmin = usuario.rol === "admin";
  if (esAdmin && filtros.activo === "todos") {
    // sin filtro
  } else if (esAdmin && filtros.activo === "false") {
    condiciones.push(eq(productos.activo, false));
  } else {
    condiciones.push(eq(productos.activo, true));
  }
  if (filtros.q) {
    condiciones.push(or(like(productos.codigo, `%${filtros.q}%`), like(productos.descripcion, `%${filtros.q}%`))!);
  }
  if (filtros.categoriaId) condiciones.push(eq(productos.categoriaId, Number(filtros.categoriaId)));
  if (filtros.bajoMinimo === "true") condiciones.push(lt(productos.existencia, productos.stockMinimo));
  const where = and(...condiciones);

  const filas = await consultaProductos().where(where).orderBy(asc(productos.codigo)).limit(pageSize).offset(offset);
  const total = await db.$count(productos, where);
  return { data: filas.map(formatoProducto), page, pageSize, total };
}

/** Cantidad de productos activos bajo el stock mínimo (contador del panel lateral). */
export async function contarBajoMinimo(_usuario: Usuario) {
  return db.$count(productos, and(eq(productos.activo, true), lt(productos.existencia, productos.stockMinimo)));
}

export async function obtenerProducto(usuario: Usuario, id: number) {
  const [fila] = await consultaProductos().where(eq(productos.id, id));
  if (!fila) throw noEncontrado("El producto");
  return formatoProducto(fila);
}

async function validarCodigoYCategoria(codigo?: string, categoriaId?: number, excepto?: number) {
  if (codigo) {
    const [otro] = await db.select({ id: productos.id }).from(productos).where(eq(productos.codigo, codigo));
    if (otro && otro.id !== excepto) throw conflicto("CODIGO_DUPLICADO", "Ya existe un producto con ese código.");
  }
  if (categoriaId) {
    const [cat] = await db.select().from(categorias).where(eq(categorias.id, categoriaId));
    if (!cat || !cat.activa) {
      throw reglaNegocio("VALIDACION", "Hay campos con errores.", [{ campo: "categoriaId", mensaje: "La categoría no existe." }]);
    }
  }
}

/**
 * RF-P2: alta (solo admin). La existencia no se carga a mano:
 * si viene stockInicial se registra un movimiento de ingreso "Stock inicial".
 */
export async function crearProducto(usuario: Usuario, datos: unknown, opciones: { fecha?: Date } = {}) {
  exigirAdmin(usuario);
  const { stockInicial, ...d } = validar(esquemaProductoAlta, datos);
  await validarCodigoYCategoria(d.codigo, d.categoriaId);

  const id = await db.transaction(async (tx) => {
    const [nuevo] = await tx.insert(productos).values(d).returning({ id: productos.id });
    if (stockInicial && stockInicial > 0) {
      await moverStock(tx, {
        productoId: nuevo.id,
        cantidad: stockInicial,
        tipo: "ingreso",
        motivo: "Stock inicial",
        usuarioId: usuario.id,
        fecha: opciones.fecha, // solo la usa el script de datos iniciales
      });
    }
    return nuevo.id;
  });
  return obtenerProducto(usuario, id);
}

/** RF-P2 y RF-P3: edición y baja lógica (activo=false). "existencia" se rechaza (422). */
export async function editarProducto(usuario: Usuario, id: number, datos: unknown) {
  exigirAdmin(usuario);
  const d = validar(esquemaProductoEdicion, datos);
  await obtenerProducto(usuario, id); // 404 si no existe
  await validarCodigoYCategoria(d.codigo, d.categoriaId, id);

  await db.update(productos).set(d).where(eq(productos.id, id));
  return obtenerProducto(usuario, id);
}
