# 1. Plan y requisitos del parcial

## Qué pide el parcial

El enunciado está en el repositorio de la cátedra (`AlejandroDiBattista/tup26-p4`, carpeta `enunciados/tp5`). Tiene tres archivos:

- `enunciado.md`: la consigna, los pasos y la defensa.
- `requerimientos.md`: el documento completo, con requerimientos, reglas, modelo de datos, arquitectura y API.
- `pantallas.html`: pantallas de referencia. Son una guía del contenido; el diseño visual tiene que ser propio.

En resumen: hay que construir un **sistema de gestión comercial** con estas partes:

| Parte | Qué hace |
| --- | --- |
| Ventas | Factura a consumidor final o a cliente, con tres formas de pago. Descuenta stock y, si es a cuenta, suma deuda |
| Productos | Catálogo, existencias, ingresos y egresos manuales, historial de movimientos y categorías |
| Clientes | Ficha, cuenta corriente (débitos y créditos), pagos con recibo y listado de saldos |
| Usuarios | Login, dos roles (administrador y vendedor) y permisos verificados en el servidor |
| Inicio | Indicadores y gráficos |

**Fecha de entrega:** domingo 22 de noviembre de 2026, 23:59.

## El plan: los 4 hitos de la cátedra

La sección 12 propone construirlo en este orden, porque cada parte depende de la anterior (no hay ventas sin productos):

| Hito | Contenido | Estado |
| --- | --- | --- |
| 1. Base y productos | Proyecto, panel lateral, login, usuarios y roles, catálogo, categorías y stock (RF-U, RF-P) | Hecho |
| 2. Clientes | Alta, ficha, cuenta corriente y pagos con recibo (RF-C) | Hecho |
| 3. Ventas | Nueva venta con las 3 formas de pago, comprobante, listado y anulación (RF-V) | Hecho |
| 4. Cierre | Tablero (RF-T), datos de prueba, revisión de interfaz y README | Hecho, falta publicar |

En el código, el orden real fue por **capas**: base de datos → servicios → sesión → API → pantallas → datos de prueba → pruebas. Así cada capa se pudo probar antes de construir la siguiente. El detalle está en la [bitácora](10-bitacora.md).

## Lo que falta hacer a mano (no lo puede hacer el código)

1. **Formar el grupo** y avisarlo por WhatsApp con los legajos.
2. **Completar el README** con integrantes, URL pública y repositorio.
3. **Crear el repositorio en GitHub** y subir el código con commits a lo largo del trabajo.
4. **Publicar**: crear la base en Turso y el proyecto en Vercel. Los pasos están en [08-publicacion.md](08-publicacion.md).
5. **Probar en línea** con la URL pública.
6. **Estudiar la defensa** con [09-defensa.md](09-defensa.md).

## Requerimientos funcionales y dónde están

### Ventas

| Código | Requerimiento | Servicio | Pantalla |
| --- | --- | --- | --- |
| RF-V1 | Nueva venta en una pantalla | `crearFactura`, `proximoNumero` en `servicios/facturas.ts` | `components/ventas/nueva-venta.tsx` |
| RF-V2 | Comprador: consumidor final, buscar o dar de alta | `crearCliente` | Diálogo "Nuevo" dentro de Nueva venta |
| RF-V3 | Ítems: buscar, cantidad, subtotal, sumar si se repite | (cálculo de pantalla; el servidor recalcula) | función `agregar` en `nueva-venta.tsx` |
| RF-V4 | No superar la existencia | `moverStock` y el paso 3 de `crearFactura` | `agregar` y `cambiarCantidad` |
| RF-V5 | Contado, tarjeta, cuenta corriente | Pasos 5 y 7 de `crearFactura` | Panel "Forma de pago" |
| RF-V6 | Confirmación en una transacción | `crearFactura` (`db.transaction`) | Botón "Confirmar venta" |
| RF-V7 | Comprobante imprimible | `obtenerFactura` | `app/(sistema)/ventas/[id]/page.tsx` |
| RF-V8 | Listado con filtros y paginado | `listarFacturas` | `app/(sistema)/ventas/page.tsx` |
| RF-V9 | Anulación (admin, con motivo) | `anularFactura` | `components/ventas/dialogo-anular.tsx` |

### Productos

| Código | Requerimiento | Servicio | Pantalla |
| --- | --- | --- | --- |
| RF-P1 | Catálogo paginado, búsqueda, categoría, bajo mínimo | `listarProductos` | `app/(sistema)/productos/page.tsx` |
| RF-P2 | Alta y edición (la existencia no se edita) | `crearProducto`, `editarProducto` | `components/productos/dialogo-producto.tsx` |
| RF-P3 | Baja lógica | `editarProducto` con `activo: false` | `components/comunes/boton-activar.tsx` |
| RF-P4 | Ingreso de stock | `registrarMovimiento` en `servicios/stock.ts` | `components/productos/dialogo-movimiento.tsx` |
| RF-P5 | Egreso de stock, sin quedar negativo | `registrarMovimiento` → `moverStock` | Mismo diálogo |
| RF-P6 | Movimientos | `listarMovimientos` | Ficha del producto y pestaña Existencias |
| RF-P7 | Categorías | `servicios/categorias.ts` | `app/(sistema)/productos/categorias/page.tsx` |

### Clientes

| Código | Requerimiento | Servicio | Pantalla |
| --- | --- | --- | --- |
| RF-C1 | Listado con saldo | `listarClientes` | `app/(sistema)/clientes/page.tsx` |
| RF-C2 | Alta y edición | `crearCliente`, `editarCliente` | `components/clientes/formulario-cliente.tsx` |
| RF-C3 | Ficha con saldo y últimas facturas | `obtenerCliente` | `app/(sistema)/clientes/[id]/page.tsx` |
| RF-C4 | Cuenta corriente con saldo acumulado | `cuentaCorriente` | Pestaña "Cuenta corriente" de la ficha |
| RF-C5 | Registrar pago y recibo | `registrarPago`, `obtenerPago` | `dialogo-pago.tsx` y `app/(sistema)/clientes/recibos/[id]` |
| RF-C6 | Saldos de mayor a menor | `listarClientes` con `conDeuda` y `orden=saldo` | `app/(sistema)/clientes/saldos/page.tsx` |
| RF-C7 | Baja lógica | `editarCliente` con `activo: false` | Botón "Dar de baja" de la ficha |

### Usuarios e inicio

| Código | Requerimiento | Dónde |
| --- | --- | --- |
| RF-U1 | Login y logout | `servicios/auth.ts` (`login`), `app/api/auth/login` y `logout` |
| RF-U2 | Todo exige sesión salvo `/login` | `proxy.ts`, `exigirUsuario` en `lib/sesion.ts`, `ruta()` en `lib/api.ts` |
| RF-U3 | Primer administrador | `src/db/seed.ts` |
| RF-U4 | Gestión de usuarios | `servicios/usuarios.ts`, `app/(sistema)/usuarios/page.tsx` |
| RF-U5 | Restablecer y cambiar contraseña | `restablecerPassword`, `cambiarPassword`, `/perfil` |
| RF-T1 | Indicadores | `servicios/tablero.ts`, `app/(sistema)/page.tsx` |
| RF-T2 | Gráficos | `components/tablero/graficos.tsx` |
| RF-T3 | 5 más vendidos | `resumenTablero` → `masVendidos` |

## Reglas de negocio (sección 6)

| Regla | Dónde se cumple |
| --- | --- |
| 1. La existencia nunca es negativa | `moverStock` (`UPDATE … WHERE existencia + cantidad >= 0`) y el paso 3 de `crearFactura` |
| 2. Todo cambio de stock deja un movimiento | `moverStock` actualiza y graba el movimiento en la misma transacción |
| 3. El precio se congela | Paso 4 de `crearFactura`: copia precio y descripción en `factura_items` |
| 4. Numeración correlativa sin huecos | `siguienteNumero` dentro de la transacción + índice único `(punto_venta, numero)` |
| 5. La factura confirmada no se modifica | No hay ruta para editarla; solo `anularFactura` |
| 6. Consumidor final no compra a cuenta | Paso 2 de `crearFactura` |
| 7. Saldo = débitos − créditos y límite | `saldoCliente` y paso 5 de `crearFactura` |
| 8. Un pago no supera la deuda | `registrarPago` |
| 9. De la tarjeta solo tipo, marca y últimos 4 | Esquema `esquemaTarjeta` (strict) y columnas de `facturas` |
| 10. Importes exactos | Todo en centavos enteros; `moneda()` en `lib/formato.ts` |
| 11. Trazabilidad | Facturas, movimientos y pagos guardan `usuarioId` y `fecha` |
| 12. Bajas lógicas | Campos `activo`/`activa`; no hay `DELETE` en la API |

## Lista de control de la defensa (sección 10.8)

| Punto | Cómo se demuestra |
| --- | --- |
| 1. Rutas sin reglas de negocio | Cualquier `route.ts` tiene 1 o 2 líneas que llaman a un servicio |
| 2. Vendedor en ruta de admin → 403 | `pnpm run probar:api` (prueba "Vendedor crea producto -> 403") |
| 3. Operación que falla no deja datos parciales | Todas las operaciones compuestas usan `db.transaction` |
| 4. Dos ventas de la última unidad | `pnpm run probar:api` (prueba "Ventas simultáneas": una 201 y una 409) |
| 5. Stock = suma de movimientos; saldo = débitos − créditos | `pnpm run db:verificar` |
| 6. El mismo esquema Zod valida en formulario y servidor | `lib/esquemas.ts`, usado en `useFormulario` y en cada servicio |
| 7. Cada regla en un solo lugar | Tabla de reglas de arriba |
