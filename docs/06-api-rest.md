# 6. API REST

La API vive bajo `/api`, habla JSON y la implementan Route Handlers de Next.js: archivos `route.ts` que exportan una función por método (`GET`, `POST`, `PATCH`, `PUT`).

## Una ruta = una o dos líneas

Ejemplo: [`src/app/api/productos/route.ts`](../src/app/api/productos/route.ts)

```ts
import { ruta } from "@/lib/api";
import { crearProducto, listarProductos } from "@/servicios/productos";

export const GET = ruta(({ usuario, query }) => listarProductos(usuario, query));
export const POST = ruta(({ usuario, body }) => crearProducto(usuario, body), { status: 201 });
```

La ruta no valida, no calcula y no decide: solo llama al servicio. Lo repetido lo hace el envoltorio `ruta()`.

## El envoltorio `ruta()`

En [`src/lib/api.ts`](../src/lib/api.ts). Para cada pedido:

1. Busca el usuario de la cookie (`usuarioActual()`). Sin sesión → `401 NO_AUTENTICADO` (salvo que la ruta sea `publica`, como el login).
2. Resuelve los parámetros de la ruta (`[id]`) y de la URL (`?q=…&page=2`).
3. Lee el JSON del cuerpo. Si no es JSON válido → `400 JSON_INVALIDO`.
4. Llama a la función de la ruta.
5. Responde: el resultado en JSON (con el `status` indicado), o `204` si no devuelve nada.
6. Si algo lanza un error lo convierte con `respuestaDeError()`:
   - Un `ApiError` → `{ "error": { "code", "message", "details" } }` con su código HTTP.
   - Cualquier otro error → se escribe en el log del servidor y se responde `500 ERROR_INTERNO` **sin el detalle** (no se filtran datos internos).

## Formato de errores

```json
{
  "error": {
    "code": "VALIDACION",
    "message": "Hay campos con errores.",
    "details": [{ "campo": "codigo", "mensaje": "Es obligatorio." }]
  }
}
```

Criterio: `409` cuando el pedido choca con el estado de los datos (código repetido, sin stock); `422` cuando está bien formado pero rompe una regla de negocio.

## Los 31 endpoints

| Método | Ruta | Rol | Servicio |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | Público | `auth.login` |
| POST | `/api/auth/logout` | Ambos | `cerrarSesion` |
| GET | `/api/auth/me` | Ambos | (usuario de la sesión) |
| PUT | `/api/auth/password` | Ambos | `auth.cambiarPassword` |
| GET | `/api/usuarios` | Admin | `usuarios.listarUsuarios` |
| POST | `/api/usuarios` | Admin | `usuarios.crearUsuario` |
| PATCH | `/api/usuarios/{id}` | Admin | `usuarios.editarUsuario` |
| POST | `/api/usuarios/{id}/reset-password` | Admin | `usuarios.restablecerPassword` |
| GET | `/api/categorias` | Ambos | `categorias.listarCategorias` |
| POST | `/api/categorias` | Admin | `categorias.crearCategoria` |
| PATCH | `/api/categorias/{id}` | Admin | `categorias.editarCategoria` |
| GET | `/api/productos` | Ambos | `productos.listarProductos` |
| GET | `/api/productos/{id}` | Ambos | `productos.obtenerProducto` |
| POST | `/api/productos` | Admin | `productos.crearProducto` |
| PATCH | `/api/productos/{id}` | Admin | `productos.editarProducto` |
| GET | `/api/productos/{id}/movimientos` | Ambos | `stock.listarMovimientos` |
| POST | `/api/productos/{id}/movimientos` | Admin | `stock.registrarMovimiento` |
| GET | `/api/movimientos-stock` | Ambos | `stock.listarMovimientos` |
| GET | `/api/clientes` | Ambos | `clientes.listarClientes` |
| GET | `/api/clientes/{id}` | Ambos | `clientes.obtenerCliente` |
| POST | `/api/clientes` | Ambos | `clientes.crearCliente` |
| PATCH | `/api/clientes/{id}` | Ambos | `clientes.editarCliente` |
| GET | `/api/clientes/{id}/cuenta` | Ambos | `clientes.cuentaCorriente` |
| POST | `/api/clientes/{id}/pagos` | Ambos | `pagos.registrarPago` |
| GET | `/api/pagos/{id}` | Ambos | `pagos.obtenerPago` |
| GET | `/api/facturas` | Ambos | `facturas.listarFacturas` |
| GET | `/api/facturas/{id}` | Ambos | `facturas.obtenerFactura` |
| GET | `/api/facturas/proximo-numero` | Ambos | `facturas.proximoNumero` |
| POST | `/api/facturas` | Ambos | `facturas.crearFactura` |
| POST | `/api/facturas/{id}/anulacion` | Admin | `facturas.anularFactura` |
| GET | `/api/tablero` | Ambos | `tablero.resumenTablero` |

`proximo-numero` es un segmento fijo y tiene prioridad sobre `[id]`, por eso `/api/facturas/proximo-numero` no se confunde con una factura.

## Paginación

Los listados aceptan `page` (desde 1) y `pageSize` (20 por defecto, máximo 100) y responden:

```json
{ "data": [], "page": 1, "pageSize": 20, "total": 137 }
```

La función `paginacion()` de [`lib/tipos.ts`](../src/lib/tipos.ts) calcula `limit` y `offset`.

## Probar la API

Con la app levantada (`pnpm run dev`), en otra terminal:

```bash
pnpm run probar:api
```

Corre 46 pruebas: sin sesión → 401, vendedor en ruta de admin → 403, código duplicado → 409, `existencia` en un PATCH → 422, número de tarjeta completo → 422, dos ventas simultáneas de la última unidad, límite de crédito, pago mayor que la deuda, anulación, usuario desactivado con sesión abierta, etc.

> El script crea datos (producto `TEST-1`, "Cliente Prueba"). Después se puede volver a los datos iniciales borrando `local.db` y corriendo `db:migrate` y `db:seed`.

### Probar a mano con curl

```bash
# 1. Login (guarda la cookie en cookies.txt)
curl -c cookies.txt -H "Content-Type: application/json" \
     -d '{"email":"pablo@ferreteria.test","password":"vendedor1234"}' \
     http://localhost:3000/api/auth/login

# 2. Listar productos con la cookie
curl -b cookies.txt "http://localhost:3000/api/productos?q=martillo"

# 3. Vender: solo productos y cantidades
curl -b cookies.txt -H "Content-Type: application/json" \
     -d '{"clienteId":null,"items":[{"productoId":1,"cantidad":1}],"pago":{"forma":"contado"}}' \
     http://localhost:3000/api/facturas
```
