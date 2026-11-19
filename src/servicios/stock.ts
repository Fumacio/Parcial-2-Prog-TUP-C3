// Servicio de stock. RF-P4, RF-P5, RF-P6 y reglas 1 y 2.
//
// IMPORTANTE: la existencia de un producto SOLO cambia en moverStock().
// Ventas, anulaciones, ingresos y egresos la llaman; ninguna toca la existencia por su cuenta.
import { and, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { facturas, movimientosStock, productos, usuarios } from "@/db/schema";
import { conflicto, noEncontrado } from "@/lib/errores";
import { esquemaMovimientoStock } from "@/lib/esquemas";
import { finDia, inicioDia } from "@/lib/fechas";
import { numeroFactura } from "@/lib/formato";
import { exigirAdmin, paginacion, type Filtros, type Usuario } from "@/lib/tipos";
import { validar } from "@/lib/validar";

type Movimiento = {
  productoId: number;
  cantidad: number; // con signo: positivo entra, negativo sale
  tipo: "venta" | "anulacion" | "ingreso" | "egreso";
  motivo: string;
  observacion?: string | null;
  usuarioId: number;
  facturaId?: number | null;
  fecha?: Date; // si no viene, es "ahora"
};

/**
 * Regla 1 y 2: cambia la existencia y graba el movimiento, dentro de la transacción recibida.
 *
 * El UPDATE tiene una condición: solo modifica la fila si la existencia NO queda negativa.
 * Si dos vendedores venden la última unidad al mismo tiempo, el segundo UPDATE no modifica
 * ninguna fila (la existencia ya es 0), se lanza STOCK_INSUFICIENTE y su transacción se deshace.
 */
export async function moverStock(tx: Tx, m: Movimiento) {
  const [actualizado] = await tx
    .update(productos)
    .set({ existencia: sql`${productos.existencia} + ${m.cantidad}` })
    .where(and(eq(productos.id, m.productoId), sql`${productos.existencia} + ${m.cantidad} >= 0`))
    .returning({ existencia: productos.existencia });

  if (!actualizado) {
    const [p] = await tx.select().from(productos).where(eq(productos.id, m.productoId));
    if (!p) throw noEncontrado("El producto");
    throw conflicto("STOCK_INSUFICIENTE", `No hay existencia suficiente de ${p.descripcion}.`, [
      { productoId: p.id, solicitado: -m.cantidad, disponible: p.existencia },
    ]);
  }

  const [movimiento] = await tx
    .insert(movimientosStock)
    .values({ ...m, existenciaResultante: actualizado.existencia })
    .returning();
  return movimiento;
}

/** RF-P4 y RF-P5: ingreso o egreso manual (solo admin). */
export async function registrarMovimiento(usuario: Usuario, productoId: number, datos: unknown) {
  exigirAdmin(usuario);
  const d = validar(esquemaMovimientoStock, datos);

  const movimiento = await db.transaction(async (tx) =>
    moverStock(tx, {
      productoId,
      cantidad: d.tipo === "ingreso" ? d.cantidad : -d.cantidad, // el signo lo pone el servidor
      tipo: d.tipo,
      motivo: d.motivo,
      observacion: d.observacion,
      usuarioId: usuario.id,
    }),
  );
  return (await listarMovimientos(usuario, { id: String(movimiento.id) })).data[0];
}

/** RF-P6: historial de movimientos, del más nuevo al más viejo. */
export async function listarMovimientos(usuario: Usuario, filtros: Filtros) {
  const { page, pageSize, offset } = paginacion(filtros);

  const condiciones: SQL[] = [];
  if (filtros.id) condiciones.push(eq(movimientosStock.id, Number(filtros.id)));
  if (filtros.productoId) condiciones.push(eq(movimientosStock.productoId, Number(filtros.productoId)));
  if (filtros.tipo) condiciones.push(eq(movimientosStock.tipo, filtros.tipo as Movimiento["tipo"]));
  if (filtros.desde) condiciones.push(gte(movimientosStock.fecha, inicioDia(filtros.desde)));
  if (filtros.hasta) condiciones.push(lt(movimientosStock.fecha, finDia(filtros.hasta)));
  const where = and(...condiciones);

  const filas = await db
    .select({
      mov: movimientosStock,
      producto: { id: productos.id, codigo: productos.codigo, descripcion: productos.descripcion },
      usuario: { id: usuarios.id, nombre: usuarios.nombre },
      factura: { puntoVenta: facturas.puntoVenta, numero: facturas.numero },
    })
    .from(movimientosStock)
    .innerJoin(productos, eq(productos.id, movimientosStock.productoId))
    .innerJoin(usuarios, eq(usuarios.id, movimientosStock.usuarioId))
    .leftJoin(facturas, eq(facturas.id, movimientosStock.facturaId))
    .where(where)
    .orderBy(desc(movimientosStock.fecha), desc(movimientosStock.id))
    .limit(pageSize)
    .offset(offset);

  const data = filas.map(({ mov, producto, usuario, factura }) => ({
    id: mov.id,
    producto,
    tipo: mov.tipo,
    cantidad: mov.cantidad,
    existenciaResultante: mov.existenciaResultante,
    motivo: mov.motivo,
    observacion: mov.observacion,
    referencia:
      mov.facturaId && factura
        ? { facturaId: mov.facturaId, numero: numeroFactura(factura.puntoVenta, factura.numero) }
        : null,
    usuario,
    fecha: mov.fecha,
  }));
  const total = await db.$count(movimientosStock, where);
  return { data, page, pageSize, total };
}
