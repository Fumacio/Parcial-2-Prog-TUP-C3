// Servicio del tablero de inicio. RF-T1, RF-T2, RF-T3.
// Solo cuenta facturas EMITIDAS. Día y mes en hora de Argentina.
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { facturaItems, facturas, movimientosCuenta, productos } from "@/db/schema";
import { diaDe, hoy, inicioDia, inicioMes, sumarDias } from "@/lib/fechas";
import type { Usuario } from "@/lib/tipos";

export async function resumenTablero(_usuario: Usuario) {
  const dia = hoy();
  const desdeHoy = inicioDia(dia);
  const desdeMes = inicioDia(inicioMes(dia));
  const desde30 = inicioDia(sumarDias(dia, -29));
  const emitida = eq(facturas.estado, "emitida");

  // Cantidad e importe de facturas emitidas desde una fecha
  const ventasDesde = async (desde: Date) => {
    const [r] = await db
      .select({ cantidad: sql<number>`count(*)`, importe: sql<number>`coalesce(sum(${facturas.total}), 0)` })
      .from(facturas)
      .where(and(emitida, gte(facturas.fecha, desde)));
    return { cantidad: Number(r.cantidad), importe: Number(r.importe) };
  };

  // RF-T1: indicadores
  const ventasHoy = await ventasDesde(desdeHoy);
  const ventasMes = await ventasDesde(desdeMes);

  const saldos = await db
    .select({
      saldo: sql<number>`sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end)`,
    })
    .from(movimientosCuenta)
    .groupBy(movimientosCuenta.clienteId);
  const conSaldo = saldos.map((s) => Number(s.saldo)).filter((s) => s > 0);

  const bajoMinimo = await db.$count(
    productos,
    and(eq(productos.activo, true), lt(productos.existencia, productos.stockMinimo)),
  );

  // RF-T2: ventas de los últimos 30 días, SIEMPRE 30 elementos (0 en los días sin ventas)
  const recientes = await db
    .select({ fecha: facturas.fecha, total: facturas.total })
    .from(facturas)
    .where(and(emitida, gte(facturas.fecha, desde30)));
  const ventasDiarias = Array.from({ length: 30 }, (_, i) => ({ fecha: sumarDias(dia, i - 29), importe: 0 }));
  for (const f of recientes) {
    const renglon = ventasDiarias.find((v) => v.fecha === diaDe(f.fecha));
    if (renglon) renglon.importe += f.total;
  }

  // RF-T2: ventas del mes por forma de pago
  const porForma = await db
    .select({ forma: facturas.formaPago, importe: sql<number>`sum(${facturas.total})` })
    .from(facturas)
    .where(and(emitida, gte(facturas.fecha, desdeMes)))
    .groupBy(facturas.formaPago);
  const porFormaDePago = (["contado", "tarjeta", "cuenta_corriente"] as const).map((forma) => ({
    forma,
    importe: Number(porForma.find((p) => p.forma === forma)?.importe ?? 0),
  }));

  // RF-T3: los 5 productos más vendidos del mes, por unidades
  const unidades = sql<number>`sum(${facturaItems.cantidad})`;
  const masVendidos = await db
    .select({
      productoId: facturaItems.productoId,
      codigo: facturaItems.codigo,
      descripcion: facturaItems.descripcion,
      unidades,
      importe: sql<number>`sum(${facturaItems.subtotal})`,
    })
    .from(facturaItems)
    .innerJoin(facturas, eq(facturas.id, facturaItems.facturaId))
    .where(and(emitida, gte(facturas.fecha, desdeMes)))
    .groupBy(facturaItems.productoId)
    .orderBy(desc(unidades))
    .limit(5);

  return {
    hoy: ventasHoy,
    mes: {
      ...ventasMes,
      ticketPromedio: ventasMes.cantidad ? Math.round(ventasMes.importe / ventasMes.cantidad) : 0,
    },
    cuentasCorrientes: {
      totalAdeudado: conSaldo.reduce((a, b) => a + b, 0),
      clientesConSaldo: conSaldo.length,
    },
    bajoMinimo: { cantidad: bajoMinimo },
    ventasDiarias,
    porFormaDePago,
    masVendidos: masVendidos.map((m) => ({ ...m, unidades: Number(m.unidades), importe: Number(m.importe) })),
  };
}
