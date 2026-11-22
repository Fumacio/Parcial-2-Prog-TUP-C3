# 10. Bitácora de desarrollo

Registro de cada paso, en el orden en que se hizo, con los problemas que aparecieron y cómo se resolvieron.

## Paso 1: leer el enunciado

Se leyeron `enunciado.md` y `requerimientos.md` del repositorio de la cátedra. Puntos clave:

- Stack obligatorio: TypeScript, Next.js con App Router, API REST con Route Handlers, Tailwind, shadcn/ui, Chart.js, Drizzle, SQLite/Turso, Vercel.
- Arquitectura (sección 10): reglas solo en servicios; rutas finas; transacciones; `moverStock()` como único punto de cambio de existencia.
- API (sección 11): 31 endpoints con formatos de respuesta y códigos de error definidos.

## Paso 2: crear el proyecto

```bash
npx create-next-app@latest sistema-comercial --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
pnpm add drizzle-orm @libsql/client zod bcryptjs chart.js react-chartjs-2
pnpm add -D drizzle-kit tsx dotenv @types/bcryptjs
npx shadcn@latest init -t next -b radix -p nova
npx shadcn@latest add input label card table badge dialog select tabs sonner alert-dialog textarea checkbox sheet separator skeleton
```

- Next.js instalado: **16.4.6**. Esta versión cambió cosas respecto de versiones anteriores: el "middleware" ahora se llama **proxy** (`src/proxy.ts`) y los `params` de las rutas son una `Promise` (hay que hacer `await params`). Se leyó la documentación que viene en `node_modules/next/dist/docs/` antes de escribir código.
- Se agregaron los scripts `db:generate`, `db:migrate`, `db:seed`, `db:verificar` y `probar:api` en `package.json`.

## Paso 3: base de datos

- Se escribió `src/db/schema.ts` con las 9 tablas de la sección 7 (más `observacion` y datos de anulación).
- `pnpm run db:generate` creó la migración inicial en `drizzle/`.

**Problema:** `drizzle-kit migrate` falló en local con *"Please provide required params for 'turso' dialect: authToken"*, porque el modo `turso` exige un token aunque la base sea un archivo.
**Solución:** `drizzle.config.ts` elige el modo según la URL: `sqlite` si empieza con `file:`, `turso` en otro caso.

## Paso 4: librerías comunes

En `src/lib/`: `errores.ts` (clase `ApiError`), `validar.ts` (Zod → 422 con detalle por campo), `esquemas.ts` (esquemas compartidos), `formato.ts` (moneda y fechas), `fechas.ts` (días en hora de Argentina), `tipos.ts` (`exigirAdmin`, `paginacion`), `config.ts` (punto de venta).

## Paso 5: servicios

Un archivo por tema en `src/servicios/`. Cada función cita en un comentario el requerimiento o la regla que implementa. Lo más delicado:

- `moverStock` con el `UPDATE … WHERE existencia + cantidad >= 0`.
- `crearFactura` con los 9 pasos de la sección 11.6 dentro de una transacción.
- `anularFactura` con un `UPDATE … WHERE estado = 'emitida'` para que no se pueda anular dos veces.

## Paso 6: sesión y permisos

- `src/lib/sesion.ts`: cookie `httpOnly` firmada con HMAC-SHA256 y el usuario buscado en la base en cada pedido.
- `src/proxy.ts`: redirige a `/login` sin cookie.
- `src/lib/api.ts`: envoltorio `ruta()` para las 31 rutas.

## Paso 7: API REST

Se crearon los 23 archivos `route.ts` (31 endpoints). Cada uno tiene una o dos líneas.

**Problema:** el primer intento de crearlos todos juntos con un script de terminal falló por un problema de comillas en Windows.
**Solución:** se generaron con un pequeño script de Node.

## Paso 8: datos iniciales

`src/db/seed.ts` crea todo con los servicios.

**Problema 1:** el seed falló con `422 VALIDACION: email inválido`. El email se armaba con el nombre del cliente y "Lucía" daba `lucía@correo.test`, que tiene un acento.
**Solución:** quitar los acentos antes de armar el email. Es un buen ejemplo de que la validación del servidor funciona también para los datos internos.

**Problema 2:** `db:verificar` mostró un cliente con saldo negativo. El seed registraba un pago y después anulaba una factura ya pagada: el crédito de la anulación dejaba saldo a favor.
**Solución:** en el seed, la anulación se hace antes de los pagos. El caso en sí es válido según el enunciado (la anulación acredita el total), así que `db:verificar` lo informa como aviso, no como error. Está explicado en [04-servicios-y-reglas.md](04-servicios-y-reglas.md).

## Paso 9: pantallas

Panel lateral, login, tablero con Chart.js, productos (catálogo, ficha, existencias, categorías), clientes (listado, ficha con cuenta corriente, saldos, recibo), ventas (nueva venta, listado, comprobante, anulación), usuarios y perfil.

**Problema:** ESLint marcó un error en Nueva venta: se llamaba a `setState` directamente dentro de `useEffect` para limpiar sugerencias y para volver a "contado" si el cliente no tenía cuenta corriente. Eso provoca renders de más.
**Solución:** esos valores pasaron a calcularse en el render (`sugerenciasProductos`, `forma`), sin efectos.

**Problema:** `next build` falló con *"cookies() rejects when the prerender is complete"*. El proyecto venía con `cacheComponents: true`, que intenta pre-generar páginas, y todas las páginas leen la cookie de sesión.
**Solución:** `cacheComponents: false` en `next.config.ts`. Todas las páginas pasan a generarse en cada pedido, que es lo correcto para datos que cambian todo el tiempo (stock, saldos).

**Problema:** la letra se veía con una fuente con serifas. El tema de shadcn espera la variable `--font-sans`, y el layout definía `--font-geist-sans`.
**Solución:** usar `variable: "--font-sans"` en `src/app/layout.tsx`.

## Paso 10: pruebas

1. `pnpm build`: compila sin errores.
2. `pnpm run probar:api`: 46 pruebas, todas bien, incluida la venta simultánea de la última unidad (una 201 y otra 409).
3. Prueba manual en el navegador: login, tablero, venta completa solo con teclado, catálogo, ficha de producto, ficha de cliente, saldos, vista de celular.

**Bug encontrado en la prueba manual:** la ficha de "Mariana López" mostraba saldo **$ 67.750,00**, pero en la base sus débitos y créditos sumaban **$ 0**.
**Causa:** el saldo se calculaba con una subconsulta SQL que comparaba `movimientos_cuenta.cliente_id = clientes.id`. Drizzle escribió el segundo lado como `"id"` a secas (sin el nombre de la tabla), y dentro de la subconsulta SQLite lo interpretó como el `id` del movimiento, no del cliente. Las pruebas de la API no lo detectaron porque la factura usaba otra función (`saldoCliente`) que estaba bien.
**Solución:** escribir la subconsulta con los nombres completos (`"clientes"."id"`) en `src/servicios/clientes.ts`, y agregar a `db:verificar` una comparación entre el saldo que muestra la app y la suma directa de movimientos, para que un error así no vuelva a pasar desapercibido.

## Paso 11: comparar con las pantallas de referencia

Se extrajeron las 30 capturas de `pantallas.html` y se compararon con cada pantalla. El enunciado pide respetar **contenido y funcionalidad**, no copiar el diseño, así que se agregó lo que faltaba de contenido:

| Pantalla | Qué se agregó |
| --- | --- |
| Panel lateral | Botón "Nueva venta", contador de productos bajo mínimo junto a "Productos" y la nota "Comprobantes internos sin validez fiscal" |
| Tablero | Saludo con la fecha, botón "Nueva venta" y la tarjeta "Para reponer" (productos bajo mínimo) |
| Catálogo | Columna "Mínimo", existencia marcada como "6 · bajo mínimo" y cantidad de productos en el encabezado |
| Facturas | Filtro por cliente y, en el encabezado, cantidad de comprobantes y total emitido con los filtros |
| Nueva venta | Atajos `F2` producto, `F4` cliente, `F8` pago, `F9` confirmar; en cuenta corriente, saldo actual, esta factura, saldo resultante y límite; unidades, número y "Descartar venta" |
| Clientes | Total adeudado en el encabezado, filtro "Solo con deuda" y documento como primera columna |
| Ficha del cliente | Link "← Clientes", "Ver todas" las facturas, filtro desde/hasta en la cuenta corriente con saldo anterior y "Saldo al cierre" |
| Recibo | Se movió a `/clientes/recibos/[id]`, como en la referencia (así queda resaltado el módulo Clientes) |
| Usuarios | Filtro por estado, columna "Alta" y "(vos)" junto al usuario conectado |

**Problema:** al probar `F4` en el navegador, el texto escrito después quedaba en el buscador de productos: el foco se movía con un pequeño retraso.
**Solución:** si el buscador de clientes ya está en pantalla, se enfoca en el momento; el retraso solo se usa cuando hay que quitar un cliente elegido.

## Paso 12: publicación y prueba en línea

- Se creó el repositorio en GitHub, la base en Turso (`sistema-comercial`, Virginia) y el proyecto en Vercel con `scripts/publicar.ps1`.
- **Problema:** la primera vez la migración en Turso falló. El token se había pegado cortado en la terminal (59 caracteres de unos 350).
  **Solución:** el script lee el token directo del portapapeles y prueba la conexión antes de migrar (`scripts/probar-conexion.mjs`).
- Se hizo el recorrido de la defensa sobre la URL pública: venta de contado, cliente nuevo con venta a cuenta, pago y anulación. Stock y saldo bien en cada paso.

## Paso 13: anulación que dejaba saldo a favor

**Problema encontrado en la revisión:** si se vendía a cuenta, el cliente pagaba una parte y después se anulaba esa factura, el crédito por el total dejaba el saldo negativo (a favor del cliente). La regla 8 dice que no se admiten saldos a favor, y es justo el recorrido de la demo de la defensa.
**Solución:** `anularFactura` calcula el saldo antes de anular. Si el crédito lo dejaría negativo, responde `422 SALDO_A_FAVOR` con un mensaje claro y no modifica nada. Se agregaron pruebas: el rechazo, que el saldo no cambie y una anulación válida de otra factura a cuenta impaga.

## Paso 14: botones de modo demo en el login

Se agregaron dos botones, **Administrador** y **Vendedor**, para entrar sin escribir usuario ni contraseña. Se eligió que manden los datos de los usuarios de prueba al login normal, en lugar de crear una ruta especial en el servidor: así no hay ningún acceso nuevo que proteger y los permisos funcionan igual. Los usuarios de prueba pasaron a una constante única (`USUARIOS_DEMO` en `lib/config.ts`) que usan el login y el seed.

## Estado final

| Verificación | Resultado |
| --- | --- |
| `npx tsc --noEmit` | Sin errores |
| `pnpm lint` | Sin errores (1 aviso aceptado en `lib/cliente-api.ts`) |
| `pnpm build` | Compila |
| `pnpm run db:verificar` | Todo cuadra |
| `pnpm run probar:api` | 50 de 50 |

Publicado en <https://parcial-2-prog-tup-c3.vercel.app> con la base en Turso. Falta (lo hace el grupo): mandar los links por WhatsApp y preparar la defensa con [09-defensa.md](09-defensa.md).
