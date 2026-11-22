# 7. Pantallas

## Mapa de pantallas

| URL | Archivo | Rol |
| --- | --- | --- |
| `/login` | `app/login/page.tsx` | Público. Tiene botones de modo demo (Administrador / Vendedor) |
| `/` | `app/(sistema)/page.tsx` | Ambos: tablero |
| `/ventas` | `app/(sistema)/ventas/page.tsx` | Ambos: listado de facturas |
| `/ventas/nueva` | `app/(sistema)/ventas/nueva/page.tsx` | Ambos: nueva venta |
| `/ventas/[id]` | `app/(sistema)/ventas/[id]/page.tsx` | Ambos (anular: admin) |
| `/productos` | `app/(sistema)/productos/page.tsx` | Ambos (alta: admin) |
| `/productos/[id]` | `app/(sistema)/productos/[id]/page.tsx` | Ambos (editar, ingreso, egreso, baja: admin) |
| `/productos/existencias` | `app/(sistema)/productos/existencias/page.tsx` | Ambos: movimientos de stock |
| `/productos/categorias` | `app/(sistema)/productos/categorias/page.tsx` | Ambos (edición: admin) |
| `/clientes` | `app/(sistema)/clientes/page.tsx` | Ambos |
| `/clientes/[id]` | `app/(sistema)/clientes/[id]/page.tsx` | Ambos: ficha y cuenta corriente |
| `/clientes/saldos` | `app/(sistema)/clientes/saldos/page.tsx` | Ambos |
| `/clientes/recibos/[id]` | `app/(sistema)/clientes/recibos/[id]/page.tsx` | Ambos: recibo imprimible |
| `/usuarios` | `app/(sistema)/usuarios/page.tsx` | Admin |
| `/perfil` | `app/(sistema)/perfil/page.tsx` | Ambos: cambiar contraseña |

## Panel lateral compartido

Lo define [`components/layout/estructura.tsx`](../src/components/layout/estructura.tsx) y lo aplica [`app/(sistema)/layout.tsx`](../src/app/(sistema)/layout.tsx) a todas las páginas de la carpeta `(sistema)`.

- Resalta el módulo activo comparando la URL actual (`usePathname`).
- "Usuarios" solo aparece para el admin.
- Arriba: nombre del usuario (link a `/perfil`), su rol y el botón "Salir".
- En pantallas de menos de 768 px el panel se oculta y aparece un botón ☰ que lo abre como menú lateral (`Sheet` de shadcn).
- `/login` está fuera de `(sistema)`, por eso no tiene panel.

## Páginas de lectura y componentes interactivos

- **Páginas (Server Components):** se ejecutan en el servidor, llaman al servicio y devuelven HTML. Ejemplo: el catálogo llama a `listarProductos(usuario, filtros)`.
- **Componentes interactivos (`"use client"`):** formularios y diálogos. Llaman a la API con `api()` de [`lib/cliente-api.ts`](../src/lib/cliente-api.ts) y después hacen `router.refresh()` para que la página vuelva a pedir los datos.

## Búsqueda, filtros y paginado en la URL

Los filtros son un formulario GET común ([`components/comunes/filtros.tsx`](../src/components/comunes/filtros.tsx)): al buscar, el navegador va a `/productos?q=martillo&categoriaId=1`. La página lee esos parámetros y se los pasa al servicio. Así un listado filtrado se puede recargar o compartir por link. El [`Paginador`](../src/components/comunes/paginador.tsx) arma los links conservando los filtros.

## Formularios: validación en los dos lados

El hook [`hooks/use-formulario.ts`](../src/hooks/use-formulario.ts) se usa en todos los formularios:

1. Valida con el **mismo esquema de Zod** que usa el servidor (`lib/esquemas.ts`). Si falla, muestra el error junto al campo y no llama a la API.
2. Si pasa, llama a la API. Si el servidor responde con errores por campo (`details`), también los muestra junto al campo.
3. Maneja el estado "Guardando…" y avisa el resultado con un toast (verde o rojo).

Ejemplo: si en "Nuevo producto" se deja la descripción vacía, el mensaje "Es obligatorio." sale del mismo `esquemaProductoAlta` que valida `POST /api/productos`.

## Estados de carga, vacío y error

| Estado | Cómo se resuelve |
| --- | --- |
| Cargando | `app/(sistema)/loading.tsx`: Next.js lo muestra mientras carga cualquier página (renglones grises animados) |
| Vacío | `FilaVacia` / `Vacio` en `components/comunes/estados.tsx`: "No hay productos con esos filtros." |
| Error | `app/(sistema)/error.tsx`: mensaje y botón "Reintentar" |
| No existe | `app/(sistema)/not-found.tsx`, por ejemplo `/productos/9999` |
| Resultado de una acción | Toast de `sonner` |

## Formatos

Todos los formatos están en [`lib/formato.ts`](../src/lib/formato.ts); ningún componente formatea por su cuenta:

- `moneda(1234550)` → `$ 12.345,50`
- `fecha(d)` → `29/10/2026` y `fechaHora(d)` → `29/10/2026 15:24`, en hora de Argentina
- `numeroFactura(1, 1233)` → `0001-00001233`
- `numeroRecibo(1, 341)` → `R 0001-00000341`

## Nueva venta con el teclado

[`components/ventas/nueva-venta.tsx`](../src/components/ventas/nueva-venta.tsx):

1. Al entrar, el cursor ya está en "Buscar producto".
2. Escribir parte del código o la descripción: aparecen sugerencias.
3. `↑` / `↓` para elegir; `Enter` agrega (con la cantidad del cuadrito de al lado). Si ya estaba, suma la cantidad.
4. El cursor vuelve al buscador para el próximo producto.
5. `Tab` o `F8` pasan a la forma de pago.
6. Atajos desde cualquier lugar de la pantalla: `F2` buscar producto, `F4` buscar cliente, `F8` ir a la forma de pago, `F9` (o `Ctrl + Enter`) confirmar.

La pantalla no deja superar la existencia (avisa con un toast) y recalcula el total en cada cambio. Igual, al confirmar, el servidor vuelve a verificar todo.

## Componentes reutilizables

| Componente | Archivo |
| --- | --- |
| Encabezado de página | `components/comunes/encabezado.tsx` |
| Maquetación: `Pila`, `Fila`, `Grilla`, `Titulo`, `Texto`, `Dato` | `components/comunes/maquetacion.tsx` |
| Estados de carga, vacío y error | `components/comunes/estados.tsx` |
| Confirmación de acciones irreversibles | `components/comunes/confirmar.tsx` |
| Campo con etiqueta y error | `components/comunes/campo.tsx` |
| Insignias de estado | `components/comunes/insignias.tsx` |
| Paginador | `components/comunes/paginador.tsx` |
| Dar de baja / reactivar | `components/comunes/boton-activar.tsx` |
| Imprimir | `components/comunes/boton-imprimir.tsx` |

Las páginas usan estos componentes y los de shadcn/ui (`components/ui/`) en lugar de etiquetas HTML sueltas, y todo el estilo está escrito con clases de Tailwind.

## Imprimir comprobantes

El comprobante (`/ventas/[id]`) y el recibo (`/clientes/recibos/[id]`) tienen un botón "Imprimir" (`window.print()`). El panel lateral, la barra superior y los botones tienen la clase `print:hidden`, así que en el papel sale solo el comprobante.
