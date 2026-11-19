# 3. Base de datos y migraciones

## Archivos

| Archivo | Para qué |
| --- | --- |
| [`src/db/schema.ts`](../src/db/schema.ts) | Define las 9 tablas con Drizzle |
| [`src/db/index.ts`](../src/db/index.ts) | Conexión: SQLite local o Turso según `DATABASE_URL` |
| [`drizzle.config.ts`](../drizzle.config.ts) | Le dice a `drizzle-kit` dónde está el esquema y a qué base conectarse |
| `drizzle/0000_*.sql` | Migración generada: el SQL `CREATE TABLE` de todas las tablas |
| [`src/db/seed.ts`](../src/db/seed.ts) | Datos de prueba |
| [`src/db/verificar.ts`](../src/db/verificar.ts) | Comprueba que stock y saldos cuadren |

## Las tablas

| Tabla | Guarda | Notas |
| --- | --- | --- |
| `usuarios` | email (único), nombre, hash de contraseña, rol, activo | Rol `admin` o `vendedor` |
| `categorias` | nombre (único), activa | |
| `productos` | código (único), descripción, categoría, precio, **existencia**, stock mínimo, activo | |
| `movimientos_stock` | producto, tipo, cantidad con signo, existencia resultante, motivo, usuario, factura | Tipos: venta, anulacion, ingreso, egreso |
| `clientes` | tipo y número de documento (único), nombre, contacto, cuenta corriente, límite, activo | **No guarda el saldo** |
| `facturas` | punto de venta + número (únicos juntos), fecha, cliente, usuario, total, forma de pago, datos de tarjeta, monto recibido, estado, anulación | Cliente nulo = consumidor final |
| `factura_items` | factura, producto, código, descripción, cantidad, precio unitario, subtotal | Precio y descripción **copiados** del catálogo |
| `pagos` | punto de venta + número de recibo, fecha, cliente, usuario, importe, medio, observación | Numeración propia |
| `movimientos_cuenta` | cliente, tipo (débito o crédito), importe, descripción, factura o pago | De acá sale el saldo |

Todas las tablas tienen `id` y `creado_en`.

## Decisiones importantes

### Los importes van en centavos enteros (regla 10)

`$ 12.345,50` se guarda como `1234550`. Los números con coma flotante no son exactos: en JavaScript `0.1 + 0.2` da `0.30000000000000004`. Con enteros, las sumas de facturas y saldos siempre dan exacto.

- Al **mostrar**: `moneda(1234550)` → `"$ 12.345,50"` ([`lib/formato.ts`](../src/lib/formato.ts)).
- Al **cargar** en un formulario: `pesosACentavos("12345,50")` → `1234550`.

### La existencia se guarda; el saldo se calcula

El enunciado permite las dos opciones; acá se usó una de cada:

- **Existencia (guardada)** en `productos.existencia`, porque así se puede descontar con un `UPDATE` condicional que evita vender dos veces la última unidad. Para que nunca descuadre, **solo la cambia `moverStock()`**, que en la misma transacción graba el movimiento. Por eso: existencia = suma de `movimientos_stock.cantidad`.
- **Saldo (calculado)**: no hay columna `saldo`. Siempre se calcula como `suma(débitos) − suma(créditos)` de `movimientos_cuenta` (función `saldoCliente` en [`servicios/clientes.ts`](../src/servicios/clientes.ts)). No puede descuadrar porque no hay dos datos que mantener iguales.

Para comprobarlo: `pnpm run db:verificar`.

### ¿Cómo sabe si usar la base local o Turso?

Por la variable `DATABASE_URL`, en [`src/db/index.ts`](../src/db/index.ts):

```ts
const client = createClient({
  url: process.env.DATABASE_URL || "file:local.db",   // local: archivo; producción: libsql://...
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});
```

El mismo cliente (`@libsql/client`) sirve para un archivo SQLite y para Turso. En Vercel, `DATABASE_URL` apunta a Turso.

## Migraciones

Una **migración** es un archivo SQL que lleva la base de un estado al siguiente (crear una tabla, agregar una columna). Quedan en la carpeta `drizzle/` y se guardan en el repositorio. Así cualquier base (la tuya, la de tus compañeros, la de Turso) llega exactamente a la misma estructura.

### Paso a paso: agregar un campo (ejemplo «marca» en productos)

1. Agregar la columna en `src/db/schema.ts`, dentro de `productos`:
   ```ts
   marca: text("marca"),
   ```
2. Generar la migración:
   ```bash
   pnpm run db:generate
   ```
   Aparece un archivo nuevo `drizzle/0001_*.sql` con `ALTER TABLE productos ADD marca text;`.
3. Aplicarla:
   ```bash
   pnpm run db:migrate
   ```
4. Agregar `marca` al esquema Zod en `src/lib/esquemas.ts` (`esquemaProductoAlta`):
   ```ts
   marca: textoOpcional(60),
   ```
   La edición lo hereda sola, porque `esquemaProductoEdicion` reutiliza los campos del alta.
5. Devolverla en `formatoProducto` (`src/servicios/productos.ts`): `marca: p.marca,`.
6. Agregar el campo al formulario (`components/productos/dialogo-producto.tsx`) y la columna al catálogo (`app/(sistema)/productos/page.tsx`).
7. En producción: correr `pnpm run db:migrate` con las variables de Turso (ver [08-publicacion.md](08-publicacion.md)).

## Datos iniciales (seed)

[`src/db/seed.ts`](../src/db/seed.ts) carga lo que pide la sección 8 del enunciado:

- 2 usuarios. El administrador se inserta directo (RF-U3: el primer admin lo crea el script); el vendedor, con el servicio `crearUsuario`.
- 5 categorías y 30 productos con su stock inicial (4 quedan bajo el mínimo).
- 10 clientes, 6 con cuenta corriente.
- 50 facturas repartidas en los últimos 30 días, 1 anulación y 4 pagos.

Las facturas y los pagos se crean **con los mismos servicios que usa la app** (sección 10.7). Así respetan todas las reglas (stock, límite de crédito, numeración) y el seed sirve también como prueba de los servicios. Los números "al azar" usan una semilla fija, por eso cada corrida genera los mismos datos.

Si la base ya tiene usuarios, el seed no hace nada (para no duplicar datos).
