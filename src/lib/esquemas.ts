// Esquemas de Zod COMPARTIDOS entre el formulario (navegador) y el servidor (sección 10.4).
// Así la regla vive en un solo lugar: el formulario adelanta el error y el servidor lo exige.
//
// Los esquemas "strictObject" rechazan campos no previstos. Por eso, sin código extra:
//  - un PATCH de producto con "existencia" da 422 (la existencia solo cambia por movimientos)
//  - una factura con el número completo de la tarjeta da 422 (regla 9)

import { z } from "zod";

// ----------------------------------------------------------- piezas reutilizables
const obligatorio = (max = 200) =>
  z.string("Es obligatorio.").trim().min(1, "Es obligatorio.").max(max, "Es demasiado largo.");

const textoOpcional = (max = 200) =>
  z.string().trim().max(max, "Es demasiado largo.").optional().nullable();

/** Importe en centavos: entero y no negativo */
const centavos = z
  .number("Debe ser un número.")
  .int("El importe debe estar en centavos.")
  .min(0, "No puede ser negativo.");

const enteroPositivo = z
  .number("Debe ser un número.")
  .int("Debe ser un número entero.")
  .positive("Debe ser mayor que cero.");

// ----------------------------------------------------------- sesión y usuarios
export const esquemaLogin = z.object({
  email: z.email("Email inválido."),
  password: z.string().min(1, "Es obligatorio."),
});

export const esquemaCambioPassword = z.object({
  actual: z.string().min(1, "Es obligatorio."),
  nueva: z.string().min(8, "Mínimo 8 caracteres."),
});

export const ROLES = ["admin", "vendedor"] as const;

export const esquemaUsuarioAlta = z.strictObject({
  nombre: obligatorio(),
  email: z.email("Email inválido."),
  rol: z.enum(ROLES, "Rol inválido."),
  password: z.string().min(8, "Mínimo 8 caracteres."),
});

export const esquemaUsuarioEdicion = z.strictObject({
  nombre: obligatorio().optional(),
  email: z.email("Email inválido.").optional(),
  rol: z.enum(ROLES, "Rol inválido.").optional(),
  activo: z.boolean().optional(),
});

// ----------------------------------------------------------- categorías y productos
export const esquemaCategoria = z.strictObject({
  nombre: obligatorio(60),
});

export const esquemaCategoriaEdicion = z.strictObject({
  nombre: obligatorio(60).optional(),
  activa: z.boolean().optional(),
});

export const esquemaProductoAlta = z.strictObject({
  codigo: obligatorio(30),
  descripcion: obligatorio(),
  categoriaId: z.number("Elegí una categoría.").int().positive("Elegí una categoría."),
  precio: centavos.positive("El precio debe ser mayor que cero."),
  stockMinimo: z.number("Debe ser un número.").int("Debe ser entero.").min(0, "No puede ser negativo."),
  stockInicial: z.number().int("Debe ser entero.").min(0, "No puede ser negativo.").optional(),
});

// Edición: los mismos campos (todos opcionales) + activo. "existencia" NO está: se rechaza.
export const esquemaProductoEdicion = z.strictObject({
  ...esquemaProductoAlta.omit({ stockInicial: true }).partial().shape,
  activo: z.boolean().optional(),
});

export const MOTIVOS_INGRESO = ["Reposición", "Stock inicial", "Devolución de cliente"];
export const MOTIVOS_EGRESO = ["Rotura", "Vencimiento", "Ajuste de inventario", "Uso interno"];

export const esquemaMovimientoStock = z
  .strictObject({
    tipo: z.enum(["ingreso", "egreso"], "Tipo inválido."),
    cantidad: enteroPositivo, // el signo lo pone el servidor
    motivo: obligatorio(60),
    observacion: textoOpcional(),
  })
  .refine(
    (m) => (m.tipo === "ingreso" ? MOTIVOS_INGRESO : MOTIVOS_EGRESO).includes(m.motivo),
    { path: ["motivo"], message: "Motivo no válido para este tipo de movimiento." },
  );

// ----------------------------------------------------------- clientes y pagos
const emailOpcional = z
  .union([z.email("Email inválido."), z.literal("")])
  .optional()
  .nullable();

export const esquemaClienteAlta = z.strictObject({
  tipoDoc: z.enum(["DNI", "CUIT"], "Tipo de documento inválido."),
  nroDoc: obligatorio(20).regex(/^[\d.\-]+$/, "Solo números, puntos o guiones."),
  nombre: obligatorio(),
  domicilio: textoOpcional(),
  telefono: textoOpcional(30),
  email: emailOpcional,
  cuentaCorriente: z.boolean().optional(),
  limiteCredito: centavos.nullable().optional(), // null = sin límite
});

export const esquemaClienteEdicion = z.strictObject({
  ...esquemaClienteAlta.partial().shape,
  activo: z.boolean().optional(),
});

export const MEDIOS_PAGO = ["efectivo", "transferencia", "tarjeta_debito"] as const;

export const esquemaPago = z.strictObject({
  importe: centavos.positive("El importe debe ser mayor que cero."),
  medio: z.enum(MEDIOS_PAGO, "Medio de pago inválido."),
  observacion: textoOpcional(),
});

// ----------------------------------------------------------- facturas
const esquemaTarjeta = z.strictObject({
  tipo: z.enum(["debito", "credito"], "Elegí débito o crédito."),
  marca: obligatorio(30),
  ultimos4: z.string("Es obligatorio.").regex(/^\d{4}$/, "Deben ser exactamente 4 dígitos."),
});

export const esquemaPagoFactura = z.discriminatedUnion("forma", [
  z.strictObject({ forma: z.literal("contado"), montoRecibido: centavos.optional() }),
  z.strictObject({ forma: z.literal("tarjeta"), tarjeta: esquemaTarjeta }),
  z.strictObject({ forma: z.literal("cuenta_corriente") }),
]);

export const esquemaFactura = z.strictObject({
  clienteId: z.number().int().positive().nullable(), // null = consumidor final
  items: z
    .array(z.strictObject({ productoId: enteroPositivo, cantidad: enteroPositivo }))
    .min(1, "Agregá al menos un producto.")
    .refine(
      (items) => new Set(items.map((i) => i.productoId)).size === items.length,
      "Hay productos repetidos.",
    ),
  pago: esquemaPagoFactura,
});

export const esquemaAnulacion = z.strictObject({
  motivo: obligatorio(),
});
