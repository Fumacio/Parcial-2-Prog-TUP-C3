// Script de datos iniciales:  pnpm run db:seed
//
// Carga lo que pide la sección 8: 2 usuarios (uno por rol), 5 categorías, 30 productos,
// 10 clientes y 50 facturas repartidas en los últimos 30 días (+ algunos pagos y una anulación).
//
// Sección 10.7: las facturas y los pagos se crean con LOS MISMOS SERVICIOS que usa la app.
// Así el stock, los saldos y la numeración cumplen todas las reglas (y de paso se prueban).
import "dotenv/config";
import { db } from "./index";
import { usuarios } from "./schema";
import { hashear, usuarioPublico } from "@/servicios/auth";
import { crearUsuario } from "@/servicios/usuarios";
import { crearCategoria } from "@/servicios/categorias";
import { crearProducto } from "@/servicios/productos";
import { crearCliente, saldoCliente } from "@/servicios/clientes";
import { anularFactura, crearFactura } from "@/servicios/facturas";
import { registrarPago } from "@/servicios/pagos";
import { ApiError } from "@/lib/errores";
import { USUARIOS_DEMO } from "@/lib/config";

// Números "al azar" pero siempre iguales en cada corrida (así los datos son reproducibles)
let semilla = 42;
function azar() {
  semilla = (semilla * 16807) % 2147483647;
  return (semilla - 1) / 2147483646;
}
const entre = (min: number, max: number) => Math.floor(azar() * (max - min + 1)) + min;
const elegir = <T,>(lista: T[]) => lista[entre(0, lista.length - 1)];
const pesos = (n: number) => Math.round(n * 100); // a centavos

async function main() {
  const existentes = await db.$count(usuarios);
  if (existentes > 0) {
    console.log("La base ya tiene datos. Para empezar de cero: borrá local.db y corré db:migrate y db:seed.");
    return;
  }

  // RF-U3: el primer administrador lo crea este script
  const [adminFila] = await db
    .insert(usuarios)
    .values({
      nombre: USUARIOS_DEMO.admin.nombre,
      email: USUARIOS_DEMO.admin.email,
      rol: "admin",
      passwordHash: await hashear(USUARIOS_DEMO.admin.password),
    })
    .returning();
  const admin = usuarioPublico(adminFila);

  const vendedorFila = await crearUsuario(admin, {
    nombre: USUARIOS_DEMO.vendedor.nombre,
    email: USUARIOS_DEMO.vendedor.email,
    rol: "vendedor",
    password: USUARIOS_DEMO.vendedor.password,
  });
  const vendedor = { ...vendedorFila, rol: "vendedor" as const };
  console.log("✔ 2 usuarios");

  // Categorías
  const nombresCategorias = ["Herramientas", "Electricidad", "Plomería", "Pinturas", "Tornillería"];
  const cats: Record<string, number> = {};
  for (const nombre of nombresCategorias) {
    cats[nombre] = (await crearCategoria(admin, { nombre })).id;
  }
  console.log("✔ 5 categorías");

  // Productos: [código, descripción, categoría, precio en pesos, stock mínimo]
  const catalogo: [string, string, string, number, number][] = [
    ["HE-001", "Martillo carpintero 500 g", "Herramientas", 12500, 5],
    ["HE-002", "Destornillador plano 6 mm", "Herramientas", 3800, 10],
    ["HE-003", "Destornillador Phillips N°2", "Herramientas", 3900, 10],
    ["HE-004", "Pinza universal 8\"", "Herramientas", 9800, 5],
    ["HE-005", "Llave francesa 10\"", "Herramientas", 14200, 4],
    ["HE-006", "Cinta métrica 5 m", "Herramientas", 6500, 8],
    ["HE-007", "Serrucho 20\"", "Herramientas", 15600, 3],
    ["EL-001", "Cinta aisladora 20 m", "Electricidad", 1900, 20],
    ["EL-002", "Lámpara LED 12 W", "Electricidad", 3200, 15],
    ["EL-003", "Toma corriente doble", "Electricidad", 4500, 10],
    ["EL-004", "Interruptor simple", "Electricidad", 2800, 10],
    ["EL-005", "Cable unipolar 2,5 mm (metro)", "Electricidad", 950, 100],
    ["EL-006", "Zapatilla 5 tomas", "Electricidad", 11200, 5],
    ["PL-001", "Cinta de teflón", "Plomería", 900, 30],
    ["PL-002", "Llave de paso 1/2\"", "Plomería", 8700, 5],
    ["PL-003", "Codo PVC 1/2\"", "Plomería", 650, 40],
    ["PL-004", "Flexible para canilla 40 cm", "Plomería", 4100, 10],
    ["PL-005", "Sellador siliconado 280 ml", "Plomería", 5300, 8],
    ["PI-001", "Látex interior 4 L", "Pinturas", 28900, 4],
    ["PI-002", "Esmalte sintético 1 L", "Pinturas", 15400, 4],
    ["PI-003", "Rodillo 22 cm", "Pinturas", 6200, 6],
    ["PI-004", "Pincel N°20", "Pinturas", 2900, 10],
    ["PI-005", "Lija al agua N°180", "Pinturas", 750, 30],
    ["PI-006", "Diluyente 1 L", "Pinturas", 4800, 6],
    ["TO-001", "Tornillo autoperforante x100", "Tornillería", 3500, 10],
    ["TO-002", "Tarugo N°8 x100", "Tornillería", 2400, 10],
    ["TO-003", "Clavo 2\" (kg)", "Tornillería", 4200, 5],
    ["TO-004", "Bulón 1/4\" x 2\" x10", "Tornillería", 2600, 8],
    ["TO-005", "Arandela plana x50", "Tornillería", 1300, 10],
    ["TO-006", "Tuerca 1/4\" x50", "Tornillería", 1700, 10],
  ];

  const hace31Dias = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  const productos: { id: number; precio: number }[] = [];
  for (const [i, [codigo, descripcion, cat, precio, minimo]] of catalogo.entries()) {
    // A los 4 primeros de Electricidad se les da poco stock para que aparezcan "bajo mínimo"
    const stockInicial = codigo.startsWith("EL-00") && i < 11 ? minimo + 8 : entre(40, 120);
    const p = await crearProducto(
      admin,
      { codigo, descripcion, categoriaId: cats[cat], precio: pesos(precio), stockMinimo: minimo, stockInicial },
      { fecha: hace31Dias },
    );
    productos.push({ id: p.id, precio: p.precio });
  }
  console.log("✔ 30 productos (con su movimiento de stock inicial)");

  // Clientes: los 6 primeros con cuenta corriente
  const datosClientes = [
    ["DNI", "28.456.123", "Mariana López", "Las Heras 455", "381 455-2210", 400000],
    ["DNI", "31.222.987", "Jorge Fernández", "Mendoza 120", "381 433-1020", 300000],
    ["CUIT", "20-27111222-3", "Construcciones del Norte SRL", "Av. Mate de Luna 2300", "381 422-9090", null],
    ["DNI", "25.678.432", "Silvia Romero", "Córdoba 845", "381 455-7788", 250000],
    ["DNI", "33.444.555", "Ricardo Gómez", "Junín 300", "381 466-1122", 200000],
    ["CUIT", "30-70888999-1", "Pinturería Sur SA", "Av. Roca 1500", "381 421-3344", 1000000],
    ["DNI", "40.111.222", "Lucía Díaz", "Salta 77", "381 470-5566", null],
    ["DNI", "29.876.543", "Martín Herrera", "Laprida 610", "381 488-9900", null],
    ["DNI", "35.333.111", "Ana Castro", "Maipú 455", "381 411-2233", null],
    ["DNI", "38.999.000", "Diego Sosa", "Santiago 1020", "381 477-6655", null],
  ] as const;
  const clientesCC: number[] = [];
  const clientesComunes: number[] = [];
  for (const [i, [tipoDoc, nroDoc, nombre, domicilio, telefono, limite]] of datosClientes.entries()) {
    const conCuenta = i < 6;
    const c = await crearCliente(admin, {
      tipoDoc,
      nroDoc,
      nombre,
      domicilio,
      telefono,
      // "Lucía" -> "lucia@correo.test" (sin acentos)
      email: `${nombre.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}@correo.test`,
      cuentaCorriente: conCuenta,
      limiteCredito: conCuenta && limite ? pesos(limite) : null,
    });
    (conCuenta ? clientesCC : clientesComunes).push(c.id);
  }
  console.log("✔ 10 clientes");

  // 50 facturas en los últimos 30 días, en orden cronológico (así la numeración sigue a las fechas)
  const fechas = Array.from({ length: 50 }, () => {
    const d = new Date(Date.now() - entre(0, 29) * 24 * 60 * 60 * 1000);
    d.setUTCHours(entre(12, 22), entre(0, 59), 0, 0); // entre las 9 y las 19 de Argentina
    return d.getTime() > Date.now() ? new Date() : d;
  }).sort((a, b) => a.getTime() - b.getTime());

  const marcas = ["Visa", "Mastercard", "Cabal", "Naranja"];
  let creadas = 0;
  const facturasCC: number[] = [];
  for (const fecha of fechas) {
    // Renglones: de 1 a 4 productos distintos
    const elegidos = new Set<number>();
    const cantidadRenglones = entre(1, 4);
    while (elegidos.size < cantidadRenglones) elegidos.add(elegir(productos).id);
    const items = [...elegidos].map((productoId) => ({ productoId, cantidad: entre(1, 3) }));

    const tipo = entre(1, 10); // 1-5 contado, 6-8 tarjeta, 9-10 cuenta corriente
    let datos;
    if (tipo <= 5) {
      datos = { clienteId: azar() < 0.3 ? elegir(clientesComunes) : null, items, pago: { forma: "contado" } };
    } else if (tipo <= 8) {
      datos = {
        clienteId: azar() < 0.5 ? elegir([...clientesComunes, ...clientesCC]) : null,
        items,
        pago: {
          forma: "tarjeta",
          tarjeta: { tipo: azar() < 0.5 ? "debito" : "credito", marca: elegir(marcas), ultimos4: String(entre(1000, 9999)) },
        },
      };
    } else {
      datos = { clienteId: elegir(clientesCC), items, pago: { forma: "cuenta_corriente" } };
    }

    try {
      const f = await crearFactura(entre(1, 3) === 1 ? admin : vendedor, datos, { fecha });
      if (f.pago.forma === "cuenta_corriente") facturasCC.push(f.id);
      creadas++;
    } catch (e) {
      // Si una venta a cuenta supera el límite, se hace de contado (la regla se respetó)
      if (e instanceof ApiError) {
        await crearFactura(vendedor, { ...datos, pago: { forma: "contado" } }, { fecha });
        creadas++;
      } else throw e;
    }
  }
  console.log(`✔ ${creadas} facturas`);

  // Una anulación de ejemplo (antes de los pagos, para no dejar saldo a favor)
  if (facturasCC.length > 0) {
    await anularFactura(admin, facturasCC[0], { motivo: "Error en la carga de cantidades" });
    console.log("✔ 1 factura anulada");
  }

  // Pagos: cada cliente con deuda paga la mitad (excepto el último, que queda debiendo todo)
  let pagosHechos = 0;
  for (const clienteId of clientesCC.slice(0, -1)) {
    const saldo = await saldoCliente(db, clienteId);
    if (saldo > 0) {
      await registrarPago(
        vendedor,
        clienteId,
        { importe: Math.round(saldo / 2), medio: elegir(["efectivo", "transferencia"]), observacion: "Pago parcial" },
        { fecha: new Date(Date.now() - entre(0, 3) * 24 * 60 * 60 * 1000) },
      );
      pagosHechos++;
    }
  }
  console.log(`✔ ${pagosHechos} pagos`);

  console.log("\nListo. Usuarios de prueba:");
  console.log("  admin:    laura@ferreteria.test / admin1234");
  console.log("  vendedor: pablo@ferreteria.test / vendedor1234");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
