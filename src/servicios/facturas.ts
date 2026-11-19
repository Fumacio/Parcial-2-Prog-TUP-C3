// Servicio de facturas. RF-V1 a RF-V9 y reglas 1, 3, 4, 5, 6, 7 y 9.
import { and, asc, desc, eq, gte, inArray, like, lt, max, or, sql, type SQL } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { clientes, facturaItems, facturas, movimientosCuenta, productos, usuarios } from "@/db/schema";
import { PUNTO_VENTA } from "@/lib/config";
import { conflicto, noEncontrado, reglaNegocio } from "@/lib/errores";
import { esquemaAnulacion, esquemaFactura } from "@/lib/esquemas";
import { finDia, inicioDia } from "@/lib/fechas";
import { numeroFactura } from "@/lib/formato";
import { exigirAdmin, paginacion, type Filtros, type Usuario } from "@/lib/tipos";
import { validar } from "@/lib/validar";
import { saldoCliente } from "./clientes";
import { moverStock } from "./stock";

/** Regla 4: próximo número correlativo. Se llama DENTRO de la transacción que graba la factura. */
async function siguienteNumero(tx: Tx | typeof db) {
  const [fila] = await tx
    .select({ n: max(facturas.numero) })
    .from(facturas)
    .where(eq(facturas.puntoVenta, PUNTO_VENTA));
  return (fila.n ?? 0) + 1;
}

/** RF-V1: número informativo que muestra la pantalla de Nueva venta (el real se asigna al confirmar). */
export async function proximoNumero(_usuario: Usuario) {
  return { numeroFormateado: numeroFactura(PUNTO_VENTA, await siguienteNumero(db)) };
}

/**
 * RF-V6: confirma una venta. Todo pasa en UNA transacción: si cualquier paso falla
 * (lanza un error), la base de datos deshace todo y no queda nada grabado a medias.
 *
 * El cliente solo manda productos y cantidades: precios y total los calcula el servidor.
 * `opciones.fecha` solo la usa el script de datos iniciales para repartir facturas en el mes.
 */
export async function crearFactura(usuario: Usuario, datos: unknown, opciones: { fecha?: Date } = {}) {
  const d = validar(esquemaFactura, datos);

  const facturaId = await db.transaction(async (tx) => {
    // 1. Los productos existen y están activos
    const ids = d.items.map((i) => i.productoId);
    const lista = await tx.select().from(productos).where(inArray(productos.id, ids));
    const porId = new Map(lista.map((p) => [p.id, p]));
    for (const item of d.items) {
      const p = porId.get(item.productoId);
      if (!p) throw noEncontrado(`El producto ${item.productoId}`);
      if (!p.activo) throw reglaNegocio("PRODUCTO_INACTIVO", `${p.descripcion} está dado de baja.`);
    }

    // 2. El cliente (si hay) está activo. Regla 6: consumidor final no compra en cuenta corriente.
    let cliente: typeof clientes.$inferSelect | undefined;
    if (d.clienteId) {
      [cliente] = await tx.select().from(clientes).where(eq(clientes.id, d.clienteId));
      if (!cliente || !cliente.activo) throw noEncontrado("El cliente");
    }
    if (d.pago.forma === "cuenta_corriente" && (!cliente || !cliente.cuentaCorriente)) {
      throw reglaNegocio(
        "CUENTA_CORRIENTE_NO_HABILITADA",
        "Para vender en cuenta corriente hace falta un cliente registrado y habilitado.",
      );
    }

    // 3. Hay existencia suficiente (se informan todos los productos que fallan)
    const faltantes = d.items
      .map((i) => ({ productoId: i.productoId, solicitado: i.cantidad, disponible: porId.get(i.productoId)!.existencia }))
      .filter((f) => f.solicitado > f.disponible);
    if (faltantes.length > 0) {
      throw conflicto("STOCK_INSUFICIENTE", "No hay existencia suficiente.", faltantes);
    }

    // 4. Regla 3: se toma el precio ACTUAL y se copia en el renglón (queda congelado)
    const renglones = d.items.map((i) => {
      const p = porId.get(i.productoId)!;
      return {
        productoId: p.id,
        codigo: p.codigo,
        descripcion: p.descripcion,
        cantidad: i.cantidad,
        precioUnitario: p.precio,
        subtotal: p.precio * i.cantidad,
      };
    });
    const total = renglones.reduce((suma, r) => suma + r.subtotal, 0);

    // 5. Contado: el monto recibido cubre el total. Cuenta corriente: regla 7, límite de crédito.
    let montoRecibido: number | null = null;
    if (d.pago.forma === "contado") {
      montoRecibido = d.pago.montoRecibido ?? total;
      if (montoRecibido < total) throw reglaNegocio("MONTO_INSUFICIENTE", "El monto recibido no cubre el total.");
    }
    if (d.pago.forma === "cuenta_corriente" && cliente!.limiteCredito != null) {
      const saldoActual = await saldoCliente(tx, cliente!.id);
      const limite = cliente!.limiteCredito!;
      if (saldoActual + total > limite) {
        throw reglaNegocio("LIMITE_CREDITO_EXCEDIDO", "La venta supera el límite de crédito del cliente.", {
          saldoActual,
          limite,
          excedente: saldoActual + total - limite,
        });
      }
    }

    // 6. Regla 4: el número se asigna recién ahora, al confirmar
    const numero = await siguienteNumero(tx);

    // 7. Factura y renglones. Regla 9: de la tarjeta solo tipo, marca y últimos 4.
    const tarjeta = d.pago.forma === "tarjeta" ? d.pago.tarjeta : null;
    const [factura] = await tx
      .insert(facturas)
      .values({
        puntoVenta: PUNTO_VENTA,
        numero,
        fecha: opciones.fecha ?? new Date(),
        clienteId: cliente?.id ?? null,
        usuarioId: usuario.id,
        total,
        formaPago: d.pago.forma,
        tarjetaTipo: tarjeta?.tipo,
        tarjetaMarca: tarjeta?.marca,
        tarjetaUltimos4: tarjeta?.ultimos4,
        montoRecibido,
      })
      .returning();
    await tx.insert(facturaItems).values(renglones.map((r) => ({ ...r, facturaId: factura.id })));

    // 8. Descuenta la existencia con un movimiento de venta por renglón (regla 2).
    //    moverStock usa un UPDATE condicional: si otra venta se llevó la última unidad, falla acá.
    const nro = numeroFactura(PUNTO_VENTA, numero);
    for (const r of renglones) {
      await moverStock(tx, {
        productoId: r.productoId,
        cantidad: -r.cantidad,
        tipo: "venta",
        motivo: `Venta ${nro}`,
        usuarioId: usuario.id,
        facturaId: factura.id,
        fecha: factura.fecha,
      });
    }

    // 9. Si es en cuenta corriente, el débito en la cuenta del cliente
    if (d.pago.forma === "cuenta_corriente") {
      await tx.insert(movimientosCuenta).values({
        clienteId: cliente!.id,
        tipo: "debito",
        importe: total,
        descripcion: `Factura ${nro}`,
        facturaId: factura.id,
        fecha: factura.fecha,
      });
    }
    return factura.id;
  });

  return obtenerFactura(usuario, facturaId);
}

/** RF-V7: factura completa (para el comprobante y el detalle). */
export async function obtenerFactura(usuario: Usuario, id: number) {
  const [fila] = await db
    .select({
      f: facturas,
      vendedor: { id: usuarios.id, nombre: usuarios.nombre },
      cliente: clientes,
    })
    .from(facturas)
    .innerJoin(usuarios, eq(usuarios.id, facturas.usuarioId))
    .leftJoin(clientes, eq(clientes.id, facturas.clienteId))
    .where(eq(facturas.id, id));
  if (!fila) throw noEncontrado("La factura");
  const { f, cliente } = fila;

  const items = await db
    .select()
    .from(facturaItems)
    .where(eq(facturaItems.facturaId, id))
    .orderBy(asc(facturaItems.id));

  // Datos de la forma de pago según cuál sea
  const pago =
    f.formaPago === "contado"
      ? { forma: f.formaPago, montoRecibido: f.montoRecibido, vuelto: (f.montoRecibido ?? f.total) - f.total }
      : f.formaPago === "tarjeta"
        ? { forma: f.formaPago, tarjeta: { tipo: f.tarjetaTipo, marca: f.tarjetaMarca, ultimos4: f.tarjetaUltimos4 } }
        : { forma: f.formaPago };

  // Si está anulada, quién y cuándo
  let anulacion = null;
  if (f.estado === "anulada" && f.anuladaPorId) {
    const [quien] = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre })
      .from(usuarios)
      .where(eq(usuarios.id, f.anuladaPorId));
    anulacion = { fecha: f.anuladaEn, usuario: quien, motivo: f.motivoAnulacion };
  }

  return {
    id: f.id,
    puntoVenta: f.puntoVenta,
    numero: f.numero,
    numeroFormateado: numeroFactura(f.puntoVenta, f.numero),
    fecha: f.fecha,
    estado: f.estado,
    cliente: cliente
      ? { id: cliente.id, nombre: cliente.nombre, tipoDoc: cliente.tipoDoc, nroDoc: cliente.nroDoc, domicilio: cliente.domicilio }
      : null,
    vendedor: fila.vendedor,
    items: items.map((i) => ({
      productoId: i.productoId,
      codigo: i.codigo,
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario,
      subtotal: i.subtotal,
    })),
    total: f.total,
    pago,
    ...(f.formaPago === "cuenta_corriente" && cliente ? { saldoCliente: await saldoCliente(db, cliente.id) } : {}),
    ...(anulacion ? { anulacion } : {}),
  };
}
export type Factura = Awaited<ReturnType<typeof obtenerFactura>>;

/** RF-V8: listado con filtros, de la más nueva a la más vieja. Suma `totalEmitido`. */
export async function listarFacturas(usuario: Usuario, filtros: Filtros) {
  const { page, pageSize, offset } = paginacion(filtros);

  const condiciones: SQL[] = [];
  if (filtros.q) {
    // Busca por número ("1233" o "0001-00001233") o por nombre del cliente
    const numero = filtros.q.match(/(\d+)\s*$/)?.[1];
    condiciones.push(
      or(
        numero ? eq(facturas.numero, Number(numero)) : undefined,
        like(clientes.nombre, `%${filtros.q}%`),
      )!,
    );
  }
  if (filtros.desde) condiciones.push(gte(facturas.fecha, inicioDia(filtros.desde)));
  if (filtros.hasta) condiciones.push(lt(facturas.fecha, finDia(filtros.hasta)));
  if (filtros.clienteId) condiciones.push(eq(facturas.clienteId, Number(filtros.clienteId)));
  if (filtros.vendedorId) condiciones.push(eq(facturas.usuarioId, Number(filtros.vendedorId)));
  if (filtros.forma) condiciones.push(eq(facturas.formaPago, filtros.forma as "contado"));
  if (filtros.estado) condiciones.push(eq(facturas.estado, filtros.estado as "emitida"));
  const where = and(...condiciones);

  const filas = await db
    .select({
      f: facturas,
      cliente: { id: clientes.id, nombre: clientes.nombre },
      vendedor: { id: usuarios.id, nombre: usuarios.nombre },
    })
    .from(facturas)
    .leftJoin(clientes, eq(clientes.id, facturas.clienteId))
    .innerJoin(usuarios, eq(usuarios.id, facturas.usuarioId))
    .where(where)
    .orderBy(desc(facturas.fecha), desc(facturas.id))
    .limit(pageSize)
    .offset(offset);

  // Total de registros y suma de las emitidas que cumplen el filtro
  const [resumen] = await db
    .select({
      total: sql<number>`count(*)`,
      totalEmitido: sql<number>`coalesce(sum(case when ${facturas.estado} = 'emitida' then ${facturas.total} else 0 end), 0)`,
    })
    .from(facturas)
    .leftJoin(clientes, eq(clientes.id, facturas.clienteId))
    .where(where);

  return {
    data: filas.map(({ f, cliente, vendedor }) => ({
      id: f.id,
      numeroFormateado: numeroFactura(f.puntoVenta, f.numero),
      fecha: f.fecha,
      cliente: cliente?.id ? cliente : null,
      vendedor,
      total: f.total,
      formaPago: f.formaPago,
      estado: f.estado,
    })),
    page,
    pageSize,
    total: Number(resumen.total),
    totalEmitido: Number(resumen.totalEmitido),
  };
}

/**
 * RF-V9 y regla 5: anulación (solo admin, motivo obligatorio). En una transacción:
 * marca la factura, reingresa el stock y, si fue a cuenta corriente, graba un crédito.
 * La factura nunca se borra.
 */
export async function anularFactura(usuario: Usuario, id: number, datos: unknown) {
  exigirAdmin(usuario);
  const { motivo } = validar(esquemaAnulacion, datos);

  await db.transaction(async (tx) => {
    const [f] = await tx.select().from(facturas).where(eq(facturas.id, id));
    if (!f) throw noEncontrado("La factura");

    // UPDATE condicional: si otra persona ya la anuló, no modifica nada
    const [anulada] = await tx
      .update(facturas)
      .set({ estado: "anulada", motivoAnulacion: motivo, anuladaEn: new Date(), anuladaPorId: usuario.id })
      .where(and(eq(facturas.id, id), eq(facturas.estado, "emitida")))
      .returning();
    if (!anulada) throw conflicto("FACTURA_ANULADA", "La factura ya estaba anulada.");

    const nro = numeroFactura(f.puntoVenta, f.numero);
    const items = await tx.select().from(facturaItems).where(eq(facturaItems.facturaId, id));
    for (const item of items) {
      await moverStock(tx, {
        productoId: item.productoId,
        cantidad: item.cantidad, // vuelve a entrar
        tipo: "anulacion",
        motivo: `Anulación ${nro}`,
        usuarioId: usuario.id,
        facturaId: id,
      });
    }

    if (f.formaPago === "cuenta_corriente" && f.clienteId) {
      await tx.insert(movimientosCuenta).values({
        clienteId: f.clienteId,
        tipo: "credito",
        importe: f.total,
        descripcion: `Anulación factura ${nro}`,
        facturaId: id,
      });
    }
  });

  return obtenerFactura(usuario, id);
}
