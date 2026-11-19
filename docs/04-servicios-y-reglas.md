# 4. Servicios y reglas de negocio

Los servicios están en [`src/servicios/`](../src/servicios). Cada función:

1. Recibe el **usuario autenticado** y los **datos sin validar** (`unknown`).
2. Valida con un esquema de Zod: `validar(esquema, datos)` lanza `422 VALIDACION` con el detalle por campo.
3. Verifica el permiso: `exigirAdmin(usuario)` lanza `403 SIN_PERMISO`.
4. Aplica las reglas y, si toca más de una tabla, abre **una transacción**.
5. Devuelve los datos con la forma pública de la API.

Si algo no se cumple, lanza un `ApiError(status, code, message, details)` ([`lib/errores.ts`](../src/lib/errores.ts)). El servicio no arma respuestas HTTP: eso lo hace el adaptador.

## Transacciones: "o se graba todo o nada"

```ts
await db.transaction(async (tx) => {
  await tx.insert(facturas)...;     // si esto anda
  await moverStock(tx, ...);        // y esto lanza un error...
});                                 // ...la base deshace TODO lo anterior
```

Dentro de `db.transaction`, si cualquier línea lanza un error, la base de datos hace *rollback*: no queda nada grabado a medias. Se usa en: confirmar factura, anular factura, registrar pago, crear producto con stock inicial y movimientos manuales.

## `moverStock()`: el único lugar que cambia la existencia

En [`src/servicios/stock.ts`](../src/servicios/stock.ts):

```ts
const [actualizado] = await tx
  .update(productos)
  .set({ existencia: sql`${productos.existencia} + ${m.cantidad}` })
  .where(and(eq(productos.id, m.productoId), sql`${productos.existencia} + ${m.cantidad} >= 0`))
  .returning({ existencia: productos.existencia });

if (!actualizado) throw conflicto("STOCK_INSUFICIENTE", ...);
// ...y en la misma transacción graba el movimiento con la existencia resultante
```

- La condición `existencia + cantidad >= 0` hace que la base **no modifique la fila** si la existencia quedaría negativa (regla 1).
- Si no se modificó ninguna fila, lanza `STOCK_INSUFICIENTE` y la transacción se deshace.
- Ventas (cantidad negativa), anulaciones, ingresos y egresos llaman a esta función. Ninguna otra parte del código escribe `existencia`.

### ¿Qué pasa si dos vendedores venden la última unidad al mismo tiempo?

1. Los dos ven "1 disponible" en pantalla y confirman.
2. Las dos transacciones llegan a `moverStock`. SQLite ejecuta las escrituras **de a una**.
3. La primera hace `UPDATE … SET existencia = 1 - 1 WHERE … 1 - 1 >= 0` → modifica la fila, existencia 0.
4. La segunda hace `UPDATE … WHERE 0 - 1 >= 0` → la condición es falsa, **no modifica nada** → `STOCK_INSUFICIENTE` → rollback: no se graba su factura, ni sus renglones, ni su número.

Resultado: una factura confirmada (201) y otra rechazada (409). El script `pnpm run probar:api` lo prueba lanzando las dos ventas en paralelo.

## Confirmar una factura paso a paso

`crearFactura` en [`src/servicios/facturas.ts`](../src/servicios/facturas.ts) sigue los 9 pasos de la sección 11.6, numerados en los comentarios:

| Paso | Qué hace | Error si falla |
| --- | --- | --- |
| 1 | Los productos existen y están activos | `404`, `422 PRODUCTO_INACTIVO` |
| 2 | El cliente existe; cuenta corriente solo con cliente habilitado (regla 6) | `422 CUENTA_CORRIENTE_NO_HABILITADA` |
| 3 | Hay existencia para todos los renglones | `409 STOCK_INSUFICIENTE` (con detalle por producto) |
| 4 | Toma el precio actual y calcula subtotales y total (regla 3) | — |
| 5 | Contado: el monto recibido alcanza. Cuenta corriente: no supera el límite (regla 7) | `422 MONTO_INSUFICIENTE`, `422 LIMITE_CREDITO_EXCEDIDO` |
| 6 | Asigna el próximo número (regla 4) | — |
| 7 | Graba factura y renglones (copia descripción y precio) | — |
| 8 | Descuenta stock con `moverStock` (un movimiento por renglón) | `409 STOCK_INSUFICIENTE` |
| 9 | Si es cuenta corriente, graba el débito | — |

**Tablas que se modifican al confirmar:** `facturas`, `factura_items`, `productos` (existencia), `movimientos_stock` y, si es a cuenta, `movimientos_cuenta`.

### ¿Por qué el navegador no manda el precio ni el total?

Porque cualquiera puede llamar a la API a mano y mandar el precio que quiera. El cuerpo solo lleva `productoId` y `cantidad`; el servidor lee el precio de la base (paso 4). El total que se ve en la pantalla de venta es solo informativo.

### Numeración sin huecos

- El número se calcula **dentro** de la transacción (`max(numero) + 1`), recién al confirmar (paso 6), no al abrir la pantalla.
- Si la venta falla, la transacción se deshace y el número no se "gasta".
- Además, la tabla tiene un índice único `(punto_venta, numero)`: la base rechaza dos facturas con el mismo número.
- El punto de venta (`0001`) está en una sola constante: `PUNTO_VENTA` en [`lib/config.ts`](../src/lib/config.ts).
- Los recibos tienen su propia numeración, con el mismo mecanismo (`registrarPago` en `servicios/pagos.ts`).

### El precio se congela

`factura_items` guarda `precio_unitario` y `descripcion` copiados en el momento de la venta. Si mañana sube el precio del martillo, las facturas viejas siguen mostrando el precio de ese día, porque nunca vuelven a leer el catálogo.

## Anular una factura

`anularFactura` (solo admin, motivo obligatorio), en una transacción:

1. Marca la factura como `anulada` con un `UPDATE … WHERE estado = 'emitida'`. Si ya estaba anulada no modifica nada → `409 FACTURA_ANULADA`.
2. Reingresa el stock de cada renglón con `moverStock` (tipo `anulacion`, cantidad positiva).
3. Si era a cuenta corriente, graba un **crédito** por el total.

La factura nunca se borra: queda visible con el estado "Anulada", quién la anuló, cuándo y por qué.

> Caso a tener en cuenta: si se anula una factura a cuenta que el cliente **ya pagó**, el crédito deja el saldo negativo (a favor del cliente). El enunciado pide el crédito por el total, así que se respeta. `db:verificar` lo muestra como aviso.

## Cuenta corriente y pagos

- **Saldo** = débitos − créditos. Débitos: ventas a cuenta. Créditos: pagos y anulaciones.
- **Límite de crédito**: si el cliente tiene límite, una venta a cuenta no puede dejar el saldo por encima (paso 5 de `crearFactura`).
- **Pago** (`registrarPago`): solo clientes con cuenta corriente; el importe no puede superar el saldo (regla 8). Graba el pago con su número de recibo y el crédito en una transacción.
- **Baja de cliente** con saldo distinto de cero, o quitarle la cuenta corriente: `422 SALDO_PENDIENTE`.

## Dónde vive cada regla

| Regla | Archivo y función |
| --- | --- |
| Stock no negativo | `servicios/stock.ts` → `moverStock` |
| Movimiento por cada cambio de stock | `servicios/stock.ts` → `moverStock` |
| Precio congelado | `servicios/facturas.ts` → `crearFactura`, paso 4 y 7 |
| Numeración | `servicios/facturas.ts` → `siguienteNumero`; `servicios/pagos.ts` → `registrarPago` |
| Consumidor final sin cuenta corriente | `servicios/facturas.ts` → `crearFactura`, paso 2 |
| Límite de crédito | `servicios/facturas.ts` → `crearFactura`, paso 5 |
| Pago no supera la deuda | `servicios/pagos.ts` → `registrarPago` |
| Datos de tarjeta | `lib/esquemas.ts` → `esquemaTarjeta` |
| Existencia no editable | `lib/esquemas.ts` → `esquemaProductoEdicion` (no tiene el campo y es estricto) |
| Bajas lógicas | `editarProducto`, `editarCliente`, `editarUsuario`, `editarCategoria` |
