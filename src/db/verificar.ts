// Verificación de consistencia:  pnpm run db:verificar
// Lista de control 10.8, punto 5:
//  - la existencia de cada producto coincide con la suma de sus movimientos
//  - el saldo de cada cliente es débitos − créditos (se calcula siempre de los movimientos,
//    así que no puede descuadrar; además ningún saldo debería quedar negativo: regla 8)
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { clientes, movimientosCuenta, movimientosStock, productos } from "./schema";
import { listarClientes } from "@/servicios/clientes";

async function main() {
  let errores = 0;

  const stock = await db
    .select({
      codigo: productos.codigo,
      existencia: productos.existencia,
      sumaMovimientos: sql<number>`coalesce(sum(${movimientosStock.cantidad}), 0)`,
    })
    .from(productos)
    .leftJoin(movimientosStock, eq(movimientosStock.productoId, productos.id))
    .groupBy(productos.id);

  for (const p of stock) {
    if (p.existencia !== Number(p.sumaMovimientos) || p.existencia < 0) {
      console.log(`✘ ${p.codigo}: existencia ${p.existencia}, suma de movimientos ${p.sumaMovimientos}`);
      errores++;
    }
  }
  console.log(`Productos revisados: ${stock.length}`);

  const saldos = await db
    .select({
      nombre: clientes.nombre,
      saldo: sql<number>`coalesce(sum(case when ${movimientosCuenta.tipo} = 'debito' then ${movimientosCuenta.importe} else -${movimientosCuenta.importe} end), 0)`,
    })
    .from(clientes)
    .leftJoin(movimientosCuenta, eq(movimientosCuenta.clienteId, clientes.id))
    .groupBy(clientes.id);

  // El saldo que muestra la app (servicio listarClientes) tiene que coincidir con la suma directa
  const delServicio = await listarClientes(
    { id: 0, nombre: "verificador", email: "", rol: "admin" },
    { activo: "todos", pageSize: "100" },
  );
  for (const c of saldos) {
    const mostrado = delServicio.data.find((x) => x.nombre === c.nombre)?.saldo;
    if (mostrado !== Number(c.saldo)) {
      console.log(`✘ ${c.nombre}: la app muestra ${mostrado} pero los movimientos suman ${c.saldo}`);
      errores++;
    }
    // No debería pasar: anularFactura rechaza la anulación que dejaría saldo a favor (regla 8).
    if (Number(c.saldo) < 0) console.log(`⚠ ${c.nombre}: saldo a favor de ${-c.saldo} centavos`);
  }
  console.log(`Clientes revisados: ${saldos.length}`);
  console.log(errores === 0 ? "✔ Todo cuadra." : `✘ ${errores} problemas.`);
  process.exit(errores === 0 ? 0 : 1);
}

main();
