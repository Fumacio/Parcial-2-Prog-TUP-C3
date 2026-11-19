// Servicio de pagos de cuenta corriente. RF-C5 y regla 8.
import { and, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { clientes, movimientosCuenta, pagos, usuarios } from "@/db/schema";
import { PUNTO_VENTA } from "@/lib/config";
import { noEncontrado, reglaNegocio } from "@/lib/errores";
import { esquemaPago } from "@/lib/esquemas";
import { numeroRecibo } from "@/lib/formato";
import type { Usuario } from "@/lib/tipos";
import { validar } from "@/lib/validar";
import { saldoCliente } from "./clientes";

/**
 * RF-C5: registra un pago. En UNA transacción graba el recibo (con su propia numeración)
 * y el crédito en la cuenta corriente. Si algo falla, no se graba nada.
 */
export async function registrarPago(
  usuario: Usuario,
  clienteId: number,
  datos: unknown,
  opciones: { fecha?: Date } = {}, // solo la usa el script de datos iniciales
) {
  const d = validar(esquemaPago, datos);

  const pagoId = await db.transaction(async (tx) => {
    const [cliente] = await tx.select().from(clientes).where(eq(clientes.id, clienteId));
    if (!cliente) throw noEncontrado("El cliente");
    if (!cliente.activo || !cliente.cuentaCorriente) {
      throw reglaNegocio("CUENTA_CORRIENTE_NO_HABILITADA", "El cliente no tiene cuenta corriente habilitada.");
    }

    // Regla 8: un pago no puede superar la deuda (no hay saldos a favor)
    const saldo = await saldoCliente(tx, clienteId);
    if (d.importe > saldo) {
      throw reglaNegocio("PAGO_SUPERA_DEUDA", "El importe supera la deuda del cliente.", { saldo });
    }

    // Regla 4: numeración correlativa propia de los recibos
    const [ultimo] = await tx
      .select({ n: max(pagos.numero) })
      .from(pagos)
      .where(eq(pagos.puntoVenta, PUNTO_VENTA));
    const numero = (ultimo.n ?? 0) + 1;

    const [pago] = await tx
      .insert(pagos)
      .values({ puntoVenta: PUNTO_VENTA, numero, clienteId, usuarioId: usuario.id, fecha: opciones.fecha, ...d })
      .returning();

    await tx.insert(movimientosCuenta).values({
      clienteId,
      tipo: "credito",
      importe: d.importe,
      descripcion: `Recibo ${numeroRecibo(PUNTO_VENTA, numero)}`,
      pagoId: pago.id,
      fecha: pago.fecha,
    });
    return pago.id;
  });

  return obtenerPago(usuario, pagoId);
}

/** Devuelve el recibo (para mostrarlo o reimprimirlo). */
export async function obtenerPago(usuario: Usuario, id: number) {
  const [fila] = await db
    .select({
      pago: pagos,
      cliente: { id: clientes.id, nombre: clientes.nombre, tipoDoc: clientes.tipoDoc, nroDoc: clientes.nroDoc },
      usuario: { id: usuarios.id, nombre: usuarios.nombre },
    })
    .from(pagos)
    .innerJoin(clientes, eq(clientes.id, pagos.clienteId))
    .innerJoin(usuarios, eq(usuarios.id, pagos.usuarioId))
    .where(and(eq(pagos.id, id)));
  if (!fila) throw noEncontrado("El recibo");

  const { pago, cliente } = fila;
  return {
    id: pago.id,
    numeroRecibo: numeroRecibo(pago.puntoVenta, pago.numero),
    fecha: pago.fecha,
    cliente,
    importe: pago.importe,
    medio: pago.medio,
    observacion: pago.observacion,
    usuario: fila.usuario,
    saldoCliente: await saldoCliente(db, cliente.id),
  };
}
