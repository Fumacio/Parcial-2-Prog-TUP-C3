// Esquema de la base de datos (sección 7 del enunciado: "Modelo de datos mínimo").
// Cada tabla es un objeto de Drizzle. A partir de este archivo, `drizzle-kit generate`
// crea las migraciones SQL en la carpeta /drizzle.
//
// Convenciones:
// - Todas las tablas tienen `id` y `creadoEn` (fecha de creación).
// - Los importes se guardan en CENTAVOS como enteros (regla 10): $ 12.345,50 => 1234550.
// - Las fechas se guardan como milisegundos (entero) y Drizzle las devuelve como Date.
// - Los booleanos se guardan como 0/1.

import { sqliteTable, integer, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Helpers para no repetir lo mismo en todas las tablas
const id = () => integer("id").primaryKey({ autoIncrement: true });
const creadoEn = () =>
  integer("creado_en", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());
const fecha = (nombre: string) =>
  integer(nombre, { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());
const booleano = (nombre: string) => integer(nombre, { mode: "boolean" });

// ---------------------------------------------------------------- usuarios
export const usuarios = sqliteTable("usuarios", {
  id: id(),
  email: text("email").notNull().unique(),
  nombre: text("nombre").notNull(),
  passwordHash: text("password_hash").notNull(), // nunca la contraseña en texto plano
  rol: text("rol", { enum: ["admin", "vendedor"] }).notNull(),
  activo: booleano("activo").notNull().default(true),
  creadoEn: creadoEn(),
});

// ---------------------------------------------------------------- categorias
export const categorias = sqliteTable("categorias", {
  id: id(),
  nombre: text("nombre").notNull().unique(),
  activa: booleano("activa").notNull().default(true),
  creadoEn: creadoEn(),
});

// ---------------------------------------------------------------- productos
// `existencia` se guarda para poder descontar con un UPDATE condicional
// (WHERE existencia >= ?). Solo la modifica la función moverStock() (regla 2).
export const productos = sqliteTable("productos", {
  id: id(),
  codigo: text("codigo").notNull().unique(),
  descripcion: text("descripcion").notNull(),
  categoriaId: integer("categoria_id")
    .notNull()
    .references(() => categorias.id),
  precio: integer("precio").notNull(), // centavos
  existencia: integer("existencia").notNull().default(0),
  stockMinimo: integer("stock_minimo").notNull().default(0),
  activo: booleano("activo").notNull().default(true),
  creadoEn: creadoEn(),
});

// ---------------------------------------------------------------- clientes
// El saldo NO se guarda: se calcula como débitos − créditos de movimientos_cuenta (regla 7).
export const clientes = sqliteTable("clientes", {
  id: id(),
  tipoDoc: text("tipo_doc", { enum: ["DNI", "CUIT"] }).notNull(),
  nroDoc: text("nro_doc").notNull().unique(),
  nombre: text("nombre").notNull(),
  domicilio: text("domicilio"),
  telefono: text("telefono"),
  email: text("email"),
  cuentaCorriente: booleano("cuenta_corriente").notNull().default(false),
  limiteCredito: integer("limite_credito"), // centavos; null = sin límite
  activo: booleano("activo").notNull().default(true),
  creadoEn: creadoEn(),
});

// ---------------------------------------------------------------- facturas
export const facturas = sqliteTable(
  "facturas",
  {
    id: id(),
    puntoVenta: integer("punto_venta").notNull(),
    numero: integer("numero").notNull(),
    fecha: fecha("fecha"),
    clienteId: integer("cliente_id").references(() => clientes.id), // null = consumidor final
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    total: integer("total").notNull(), // centavos
    formaPago: text("forma_pago", {
      enum: ["contado", "tarjeta", "cuenta_corriente"],
    }).notNull(),
    // De la tarjeta solo se guarda tipo, marca y últimos 4 dígitos (regla 9)
    tarjetaTipo: text("tarjeta_tipo", { enum: ["debito", "credito"] }),
    tarjetaMarca: text("tarjeta_marca"),
    tarjetaUltimos4: text("tarjeta_ultimos4"),
    montoRecibido: integer("monto_recibido"), // solo contado
    estado: text("estado", { enum: ["emitida", "anulada"] })
      .notNull()
      .default("emitida"),
    motivoAnulacion: text("motivo_anulacion"),
    anuladaEn: integer("anulada_en", { mode: "timestamp_ms" }),
    anuladaPorId: integer("anulada_por_id").references(() => usuarios.id),
    creadoEn: creadoEn(),
  },
  // Numeración sin repetidos: la base rechaza dos facturas con el mismo número (regla 4)
  (t) => [uniqueIndex("facturas_numero_unico").on(t.puntoVenta, t.numero)],
);

// ---------------------------------------------------------------- factura_items
// Precio y descripción se COPIAN del catálogo al facturar (regla 3: el precio se congela).
export const facturaItems = sqliteTable("factura_items", {
  id: id(),
  facturaId: integer("factura_id")
    .notNull()
    .references(() => facturas.id),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  codigo: text("codigo").notNull(),
  descripcion: text("descripcion").notNull(),
  cantidad: integer("cantidad").notNull(),
  precioUnitario: integer("precio_unitario").notNull(),
  subtotal: integer("subtotal").notNull(),
  creadoEn: creadoEn(),
});

// ---------------------------------------------------------------- movimientos_stock
// Cada cambio de existencia deja un renglón aquí (regla 2).
export const movimientosStock = sqliteTable("movimientos_stock", {
  id: id(),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  tipo: text("tipo", {
    enum: ["venta", "anulacion", "ingreso", "egreso"],
  }).notNull(),
  cantidad: integer("cantidad").notNull(), // con signo: + entra, − sale
  existenciaResultante: integer("existencia_resultante").notNull(),
  motivo: text("motivo").notNull(),
  observacion: text("observacion"),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  facturaId: integer("factura_id").references(() => facturas.id),
  fecha: fecha("fecha"),
  creadoEn: creadoEn(),
});

// ---------------------------------------------------------------- pagos
export const pagos = sqliteTable(
  "pagos",
  {
    id: id(),
    puntoVenta: integer("punto_venta").notNull(),
    numero: integer("numero").notNull(), // numeración propia de recibos (regla 4)
    fecha: fecha("fecha"),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => clientes.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuarios.id),
    importe: integer("importe").notNull(),
    medio: text("medio", {
      enum: ["efectivo", "transferencia", "tarjeta_debito"],
    }).notNull(),
    observacion: text("observacion"),
    creadoEn: creadoEn(),
  },
  (t) => [uniqueIndex("pagos_numero_unico").on(t.puntoVenta, t.numero)],
);

// ---------------------------------------------------------------- movimientos_cuenta
// Débitos (ventas a cuenta) y créditos (pagos y anulaciones) del cliente.
export const movimientosCuenta = sqliteTable("movimientos_cuenta", {
  id: id(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id),
  tipo: text("tipo", { enum: ["debito", "credito"] }).notNull(),
  importe: integer("importe").notNull(), // siempre positivo; el tipo dice si suma o resta
  descripcion: text("descripcion").notNull(),
  facturaId: integer("factura_id").references(() => facturas.id),
  pagoId: integer("pago_id").references(() => pagos.id),
  fecha: fecha("fecha"),
  creadoEn: creadoEn(),
});
