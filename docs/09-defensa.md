# 9. Guía para la defensa

La defensa tiene tres partes (sección 12 y `enunciado.md`):

1. **Demo de 10 minutos** sobre la URL pública.
2. **Preguntas** a cada integrante por separado, mostrando el código.
3. **Un cambio pequeño** hecho en el momento.

## 1. Guion de la demo

Entrar como administrador (`laura@ferreteria.test` / `admin1234`).

1. **Venta a consumidor final en efectivo.** Antes, abrir un producto (por ejemplo `HE-001`) y anotar la existencia. Ir a Ventas → Nueva venta, buscar "martillo", Enter, poner un monto recibido mayor y mostrar el vuelto. `F9`. Volver al producto: la existencia bajó y hay un movimiento "Venta 0001-…".
2. **Venta a un cliente nuevo en cuenta corriente.** Nueva venta → botón "Nuevo" en Comprador → cargar DNI, nombre, marcar "Habilitado para cuenta corriente" y un límite. Agregar productos, elegir "Cta. cte." y confirmar. Ir a la ficha del cliente: saldo = total de la factura; pestaña Cuenta corriente con el débito.
3. **Pago de ese cliente.** En la ficha: "Registrar pago" por una parte del saldo → se abre el recibo `R 0001-…`. Volver a la ficha: el saldo bajó; en la cuenta corriente aparece el crédito.
4. **Anulación de una factura.** Abrir la factura del paso 1 (contado) → "Anular" → motivo. Revisar: estado "Anulada" con quién, cuándo y por qué, y el stock volvió (movimiento "Anulación").
   - Si piden anular la factura **a cuenta del paso 2**, que ya se pagó en parte, el sistema la **rechaza** con el mensaje *"quedaría con saldo a favor"*. Es la regla 8: no se admiten saldos a favor. Explicarlo y mostrar `anularFactura` en `src/servicios/facturas.ts`.
   - Para mostrar el crédito en la cuenta corriente: hacer otra venta a cuenta al mismo cliente y anularla **sin pagarla**. Se reingresa el stock y aparece un crédito por el total.

Extras rápidos si sobra tiempo: entrar como vendedor y mostrar que no ve "Usuarios" ni "Anular"; correr `pnpm run db:verificar`.

## 2. Preguntas del enunciado, con su respuesta

### Arquitectura y organización

| Pregunta | Respuesta |
| --- | --- |
| ¿Dónde están las reglas de negocio? | En `src/servicios/`, un archivo por tema. Las rutas y las páginas solo llaman a esas funciones |
| ¿Qué hace una ruta de la API? | Solo llama a un servicio. Ver cualquier `src/app/api/**/route.ts` |
| ¿Por qué hay un envoltorio común? | `ruta()` en `src/lib/api.ts` hace lo que se repite en las 31 rutas: sesión, parámetros, JSON y errores |
| Páginas de lectura vs. acciones | Las páginas (Server Components) llaman al servicio directamente. Las acciones las hace un componente cliente llamando a la API, que llama al mismo servicio |

### Base de datos

| Pregunta | Respuesta |
| --- | --- |
| ¿Dónde se definen las tablas? | `src/db/schema.ts` |
| ¿Dónde se conecta? ¿Local o Turso? | `src/db/index.ts`. Depende de `DATABASE_URL`: `file:local.db` o `libsql://…` |
| ¿Cómo se crea una tabla o un campo? ¿Qué es una migración? | Se cambia `schema.ts`, `pnpm run db:generate` crea el SQL en `drizzle/` y `pnpm run db:migrate` lo aplica. La migración es ese archivo SQL versionado. Ver [03-base-de-datos.md](03-base-de-datos.md) |
| ¿Dónde se cargan los datos de prueba? | `src/db/seed.ts`, usando los mismos servicios que la app |
| ¿Cómo se guardan los importes? ¿Por qué no coma flotante? | En centavos, como enteros. La coma flotante no es exacta (`0.1 + 0.2 ≠ 0.3`) y las sumas de dinero tienen que cuadrar |
| ¿La existencia se guarda o se calcula? ¿Y el saldo? | La existencia se guarda (`productos.existencia`) pero solo la cambia `moverStock`, junto con el movimiento. El saldo se calcula siempre de `movimientos_cuenta` |
| ¿Qué tablas se modifican al confirmar una factura? | `facturas`, `factura_items`, `productos`, `movimientos_stock` y, si es a cuenta, `movimientos_cuenta` |

### API REST

| Pregunta | Respuesta |
| --- | --- |
| ¿Dónde está la ruta para agregar un producto? | `src/app/api/productos/route.ts`, `POST` → `crearProducto` en `src/servicios/productos.ts` |
| ¿Qué responde si el código ya existe? | `409` con `CODIGO_DUPLICADO` (función `validarCodigoYCategoria`) |
| ¿Dónde se verifica la sesión? | En `ruta()` de `src/lib/api.ts`, que llama a `usuarioActual()` de `src/lib/sesion.ts` |
| ¿Qué pasa si un vendedor llama a una ruta de admin? | `403 SIN_PERMISO`, lo lanza `exigirAdmin` dentro del servicio. Mostrarlo con `pnpm run probar:api` o con curl (ver [05-sesion-y-permisos.md](05-sesion-y-permisos.md)) |
| ¿Dónde se arma la respuesta de error? | `respuestaDeError()` en `src/lib/api.ts` |
| ¿Por qué el cliente no manda precio ni total? | Porque se podría manipular. El servidor lee el precio del catálogo (paso 4 de `crearFactura`) |

### Reglas de negocio

| Pregunta | Respuesta |
| --- | --- |
| ¿Dónde se verifica que el stock no quede negativo? | `moverStock` en `src/servicios/stock.ts` (UPDATE con condición) y el paso 3 de `crearFactura` |
| ¿Dos vendedores venden la última unidad a la vez? | El UPDATE condicional deja pasar solo a uno; el otro recibe `STOCK_INSUFICIENTE` y su transacción se deshace. Ver [04-servicios-y-reglas.md](04-servicios-y-reglas.md) |
| ¿Dónde se asegura que la factura se grabe completa o nada? | `db.transaction(...)` en `crearFactura` |
| ¿Dónde se asigna el número? ¿Cómo se evitan huecos? | `siguienteNumero(tx)`, dentro de la transacción y al confirmar. Si la venta falla no se gasta el número. Índice único `(punto_venta, numero)` |
| Si cambia el precio, ¿qué pasa con las facturas emitidas? | Nada: `factura_items` guarda el precio copiado al vender |
| ¿Dónde se impide vender a cuenta a consumidor final? | Paso 2 de `crearFactura` |
| ¿Dónde se controla el límite de crédito? | Paso 5 de `crearFactura` |
| ¿Dónde se impide un pago mayor que la deuda? | `registrarPago` en `src/servicios/pagos.ts` |
| ¿Qué hace el sistema al anular? | `anularFactura`: marca anulada, reingresa stock con movimientos de anulación y, si fue a cuenta, graba un crédito por el total. No borra la factura. Si el cliente ya pagó parte de esa factura, el crédito lo dejaría con saldo a favor (regla 8), así que responde `422 SALDO_A_FAVOR` y no cambia nada |
| ¿Dónde queda registrado cada movimiento de stock? | Tabla `movimientos_stock`, que graba `moverStock` |

### Seguridad y permisos

| Pregunta | Respuesta |
| --- | --- |
| ¿Dónde se ingresa el número de tarjeta? | En ninguna parte. Solo tipo, marca y últimos 4. Si la API recibe el número completo responde `422` (esquema estricto `esquemaTarjeta`) |
| ¿Cómo se guardan las contraseñas? | Con hash bcrypt (`hashear` en `src/servicios/auth.ts`) |
| ¿Dónde se verifica el rol? ¿Alcanza con ocultar el botón? | En el servicio (`exigirAdmin`). Ocultar el botón es solo visual; la API responde `403` igual |
| ¿Dónde está el secreto de la sesión? ¿Por qué no en el repo? | En la variable `SESSION_SECRET` (`.env` en local, Vercel en producción). Con el secreto cualquiera podría firmar una cookie de admin |
| ¿Qué pasa si se desactiva a un usuario con la sesión abierta? | Pierde el acceso en el siguiente pedido: `usuarioActual()` busca el usuario en la base cada vez |

### Interfaz

| Pregunta | Respuesta |
| --- | --- |
| ¿Dónde está el panel lateral? | `src/components/layout/estructura.tsx`, aplicado en `src/app/(sistema)/layout.tsx` |
| ¿Dónde se formatean importes y fechas? | `src/lib/formato.ts` |
| ¿Dónde se validan los formularios? ¿Las mismas reglas en el servidor? | Con los esquemas de `src/lib/esquemas.ts`, usados por `useFormulario` y por cada servicio. Sí, son las mismas |
| ¿Cómo se agrega un producto a la venta solo con el teclado? | `F2` (buscador), escribir, `↑`/`↓`, `Enter` agrega. `F4` cliente, `F8` pago, `F9` confirma |
| ¿Qué muestra un listado mientras carga, vacío o con error? | `loading.tsx` (esqueleto gris), `FilaVacia` ("No hay…") y `error.tsx` (mensaje y "Reintentar") |

### Publicación

| Pregunta | Respuesta |
| --- | --- |
| ¿Qué variables necesita en producción y dónde se cargan? | `DATABASE_URL`, `DATABASE_AUTH_TOKEN` y `SESSION_SECRET`, en Settings → Environment Variables de Vercel |
| ¿Cómo se crearon las tablas en Turso? | Con `pnpm run db:migrate` apuntando a Turso (mismas migraciones que en local). Ver [08-publicacion.md](08-publicacion.md) |
| ¿Cómo se comprueba que el sitio usa Turso? | Crear algo en el sitio y verlo con `turso db shell` o en el panel web de Turso |

### Uso de inteligencia artificial

Estas respuestas son de cada integrante. Para "algo que el agente hizo mal y cómo se corrigió", la [bitácora](10-bitacora.md) tiene casos reales encontrados durante el desarrollo; el más claro es el del saldo mal calculado por una subconsulta SQL.

## 3. Cambios pequeños: cómo hacer cada ejemplo

### Agregar el campo «marca» a los productos y mostrarlo en el catálogo

Seguir los 7 pasos de [03-base-de-datos.md → Paso a paso](03-base-de-datos.md#paso-a-paso-agregar-un-campo-ejemplo-marca-en-productos).

### Agregar «Mercado Pago» como medio de pago de la cuenta corriente

1. `src/db/schema.ts`, tabla `pagos`, columna `medio`: agregar `"mercado_pago"` al `enum`. En SQLite el enum es solo un tipo de TypeScript, así que no cambia la tabla; igual se puede correr `pnpm run db:generate` para confirmarlo.
2. `src/lib/esquemas.ts`: agregar `"mercado_pago"` a `MEDIOS_PAGO`.
3. `src/lib/formato.ts`: agregar `mercado_pago: "Mercado Pago"` en `nombresMedioPago`.

El select del diálogo de pago se arma con `MEDIOS_PAGO`, así que aparece solo.

### Impedir que una venta tenga más de 50 unidades de un mismo producto

En `src/lib/esquemas.ts`, dentro de `esquemaFactura`, la cantidad de cada ítem:

```ts
.array(z.strictObject({ productoId: enteroPositivo, cantidad: enteroPositivo.max(50, "Máximo 50 unidades por producto.") }))
```

Como el esquema es compartido, lo valida la pantalla (al confirmar) y el servidor.

### Exigir que el teléfono tenga al menos 8 dígitos, en el formulario y en el servidor

En `src/lib/esquemas.ts`, en `esquemaClienteAlta`, reemplazar `telefono`:

```ts
telefono: z
  .string()
  .trim()
  .refine((t) => t === "" || t.replace(/\D/g, "").length >= 8, "El teléfono debe tener al menos 8 dígitos.")
  .optional()
  .nullable(),
```

El formulario de cliente usa `esquemaClienteAlta` con `useFormulario` (error junto al campo) y `crearCliente` / `editarCliente` usan el mismo esquema en el servidor. La edición lo hereda porque `esquemaClienteEdicion` reutiliza los campos del alta.

### Agregar una columna al listado de facturas

Ejemplo: cantidad de renglones o el documento del cliente. En `src/servicios/facturas.ts` → `listarFacturas`, agregar el dato al `select` y al `map` del resultado. Después, en `src/app/(sistema)/ventas/page.tsx`, agregar un `<TableHead>` y un `<TableCell>`. Si el dato ya viene (por ejemplo `vendedor`), alcanza con el segundo paso.

### Cambiar el punto de venta de la numeración a 0002

En `src/lib/config.ts`: `export const PUNTO_VENTA = 2;`. La próxima factura sale `0002-00000001`, porque `siguienteNumero` busca el máximo **de ese punto de venta**. Los recibos también lo usan.
