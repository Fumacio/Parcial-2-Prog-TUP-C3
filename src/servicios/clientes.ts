// Servicio de clientes y cuenta corriente. RF-C1, RF-C2, RF-C3, RF-C4, RF-C6, RF-C7.
//
// El saldo NO se guarda en la tabla clientes: siempre se calcula como
// débitos − créditos de movimientos_cuenta (regla 7). Así nunca puede "descuadrar".
import { and, asc, desc, eq, gt, like, lt, or, sql, type SQL } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { clientes, facturas, movimientosCuenta } from "@/db/schema";
import { conflicto, noEncontrado, reglaNegocio } from "@/lib/errores";
import { esquemaClienteAlta, esquemaClienteEdicion } from "@/lib/esquemas";
import { inicioDia, finDia } from "@/lib/fechas";
import { numeroFactura } from "@/lib/formato";
import { paginacion, soloDigitos, type Filtros, type Usuario } from "@/lib/tipos";
import { validar } from "@/lib/validar";

/**
 * Saldo de un cliente calculado en SQL (subconsulta): suma débitos y resta créditos.
 * Los nombres van escritos completos ("clientes"."id") a propósito: dentro de la subconsulta
 * un "id" suelto se confundiría con el id de movimientos_cuenta.
 */
const saldoSql = sql<number>`coalesce((
  select sum(case when mc.tipo = 'debito' then mc.importe else -mc.importe end)
  from movimientos_cuenta mc where mc.cliente_id = "clientes"."id"
), 0)`;

/** Documento sin puntos ni guiones, para buscar y para detectar duplicados */
const docSinFormato = sql`replace(replace(replace(${clientes.nroDoc}, '.', ''), '-', ''), ' ', '')`;

/** Saldo de un cliente (se usa dentro de transacciones: facturas y pagos). */
export async function saldoCliente(tx: Tx | typeof db, clienteId: number): Promise<number> {
  const [fila] = await tx
    .select({
      saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
    })
    .from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, clienteId));
  return Number(fila.saldo);
}

// Forma pública del cliente (sección 11.5)
function formatoCliente(c: typeof clientes.$inferSelect, saldo: number) {
  return {
    ...c,
    saldo,
    disponible: c.limiteCredito == null ? null : c.limiteCredito - saldo,
  };
}
export type Cliente = ReturnType<typeof formatoCliente>;

/** RF-C1 y RF-C6: listado con saldo. conDeuda=true + orden=saldo arma el listado de saldos. */
export async function listarClientes(usuario: Usuario, filtros: Filtros) {
  const { page, pageSize, offset } = paginacion(filtros);

  const condiciones: SQL[] = [];
  if (filtros.activo !== "todos") condiciones.push(eq(clientes.activo, filtros.activo !== "false"));
  if (filtros.q) {
    const digitos = soloDigitos(filtros.q);
    condiciones.push(
      or(
        like(clientes.nombre, `%${filtros.q}%`),
        digitos ? like(docSinFormato, `%${digitos}%`) : undefined,
      )!,
    );
  }
  if (filtros.conDeuda === "true") condiciones.push(gt(saldoSql, 0));
  const where = and(...condiciones);

  const filas = await db
    .select({ c: clientes, saldo: saldoSql })
    .from(clientes)
    .where(where)
    .orderBy(filtros.orden === "saldo" ? desc(saldoSql) : asc(clientes.nombre))
    .limit(pageSize)
    .offset(offset);

  const total = await db.$count(clientes, where);
  const resultado = { data: filas.map((f) => formatoCliente(f.c, Number(f.saldo))), page, pageSize, total };

  if (filtros.conDeuda === "true") {
    const [suma] = await db.select({ total: sql<number>`coalesce(sum(${saldoSql}), 0)` }).from(clientes).where(where);
    return { ...resultado, totalAdeudado: Number(suma.total) };
  }
  return resultado;
}

/** RF-C3: ficha del cliente con sus 6 últimas facturas. */
export async function obtenerCliente(usuario: Usuario, id: number) {
  const [fila] = await db.select({ c: clientes, saldo: saldoSql }).from(clientes).where(eq(clientes.id, id));
  if (!fila) throw noEncontrado("El cliente");

  const ultimas = await db
    .select()
    .from(facturas)
    .where(eq(facturas.clienteId, id))
    .orderBy(desc(facturas.fecha), desc(facturas.id))
    .limit(6);

  return {
    ...formatoCliente(fila.c, Number(fila.saldo)),
    ultimasFacturas: ultimas.map((f) => ({
      id: f.id,
      numeroFormateado: numeroFactura(f.puntoVenta, f.numero),
      fecha: f.fecha,
      total: f.total,
      formaPago: f.formaPago,
      estado: f.estado,
    })),
  };
}

async function documentoEnUso(nroDoc: string, excepto?: number) {
  const [otro] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(docSinFormato, soloDigitos(nroDoc)));
  return otro && otro.id !== excepto;
}

/** RF-C2 (y RF-V2: alta rápida desde Nueva venta). Lo pueden hacer ambos roles. */
export async function crearCliente(usuario: Usuario, datos: unknown) {
  const d = validar(esquemaClienteAlta, datos);
  if (await documentoEnUso(d.nroDoc)) throw conflicto("DOCUMENTO_DUPLICADO", "Ya existe un cliente con ese documento.");

  const [nuevo] = await db
    .insert(clientes)
    .values({ ...d, email: d.email || null })
    .returning({ id: clientes.id });
  return obtenerCliente(usuario, nuevo.id);
}

/** RF-C2 y RF-C7: edición y baja lógica. Con saldo pendiente no se puede dar de baja ni quitar la cuenta. */
export async function editarCliente(usuario: Usuario, id: number, datos: unknown) {
  const d = validar(esquemaClienteEdicion, datos);
  const actual = await obtenerCliente(usuario, id);

  if ((d.activo === false || d.cuentaCorriente === false) && actual.saldo !== 0) {
    throw reglaNegocio("SALDO_PENDIENTE", "El cliente tiene saldo pendiente en su cuenta corriente.");
  }
  if (d.nroDoc && (await documentoEnUso(d.nroDoc, id))) {
    throw conflicto("DOCUMENTO_DUPLICADO", "Ya existe un cliente con ese documento.");
  }

  await db
    .update(clientes)
    .set({ ...d, ...(d.email !== undefined ? { email: d.email || null } : {}) })
    .where(eq(clientes.id, id));
  return obtenerCliente(usuario, id);
}

/** RF-C4: movimientos de la cuenta corriente con el saldo acumulado en cada renglón. */
export async function cuentaCorriente(usuario: Usuario, id: number, filtros: Filtros) {
  const [cliente] = await db
    .select({ id: clientes.id, nombre: clientes.nombre })
    .from(clientes)
    .where(eq(clientes.id, id));
  if (!cliente) throw noEncontrado("El cliente");

  const todos = await db
    .select()
    .from(movimientosCuenta)
    .where(
      and(
        eq(movimientosCuenta.clienteId, id),
        filtros.hasta ? lt(movimientosCuenta.fecha, finDia(filtros.hasta)) : undefined,
      ),
    )
    .orderBy(asc(movimientosCuenta.fecha), asc(movimientosCuenta.id));

  // Se recorre en orden cronológico acumulando el saldo
  const desde = filtros.desde ? inicioDia(filtros.desde) : null;
  let saldo = 0;
  let saldoAnterior = 0;
  const movimientos = [];
  for (const m of todos) {
    saldo += m.tipo === "debito" ? m.importe : -m.importe;
    if (desde && m.fecha < desde) {
      saldoAnterior = saldo; // lo acumulado antes de "desde"
      continue;
    }
    movimientos.push({
      fecha: m.fecha,
      tipo: m.tipo,
      importe: m.importe,
      descripcion: m.descripcion,
      facturaId: m.facturaId,
      pagoId: m.pagoId,
      saldo,
    });
  }
  return { cliente, saldoAnterior, movimientos, saldo };
}
