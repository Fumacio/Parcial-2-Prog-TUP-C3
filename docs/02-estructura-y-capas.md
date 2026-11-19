# 2. Estructura de carpetas y capas

## La idea central

La sección 10 del enunciado pide un principio: **cada regla de negocio vive en un único lugar, la capa de servicios.** Todo lo demás son "adaptadores" finos que no deciden nada.

```text
  Navegador                         Servidor (Next.js)
 ┌──────────────┐  fetch JSON   ┌──────────────────┐
 │ Componentes  │ ────────────▶ │ API REST         │──┐
 │ "use client" │               │ app/api/**/route │  │
 └──────────────┘               └──────────────────┘  │   ┌─────────────┐   ┌────────────┐
                                                       ├──▶│ Servicios   │──▶│ Base de    │
 ┌──────────────┐  render       ┌──────────────────┐  │   │ src/servicios│  │ datos      │
 │ HTML         │ ◀──────────── │ Páginas (server) │──┘   └─────────────┘   │ (Drizzle)  │
 └──────────────┘               │ app/(sistema)/** │                         └────────────┘
                                └──────────────────┘
```

- **Las páginas de lectura** (listados, fichas) son Server Components: llaman al servicio directamente y devuelven HTML.
- **Las acciones** (crear, editar, vender, anular) las hace un componente del navegador llamando a la **API REST**, que llama al **mismo servicio**.
- Por eso, si la misma regla hiciera falta en dos lugares, igual está una sola vez: en el servicio.

## Las 4 capas

| Capa | Carpeta | Qué hace | Qué NO hace |
| --- | --- | --- | --- |
| Acceso a datos | `src/db/` | Esquema de tablas, conexión, migraciones | Reglas de negocio |
| Servicios | `src/servicios/` | Valida con Zod, verifica el rol, aplica reglas, abre transacciones | No conoce HTTP, cookies ni componentes |
| Adaptadores | `src/app/api/`, `src/lib/api.ts`, páginas | Exigen sesión, leen parámetros, llaman al servicio y responden | No repiten validaciones |
| Interfaz | `src/components/`, `src/app/(sistema)/` | Muestra datos, adelanta validaciones, avisa resultados | No reemplaza controles del servidor |

## Cada servicio sigue el mismo orden

Ejemplo real, `crearCategoria` en `src/servicios/categorias.ts`:

```ts
export async function crearCategoria(usuario: Usuario, datos: unknown) {
  exigirAdmin(usuario);                         // 1. verifica el permiso
  const d = validar(esquemaCategoria, datos);   // 2. valida con Zod (lanza 422 si falla)
  if (await nombreEnUso(d.nombre))              // 3. aplica las reglas
    throw conflicto("NOMBRE_DUPLICADO", "Ya existe una categoría con ese nombre.");
  const [nueva] = await db.insert(categorias).values(d).returning();
  return nueva;                                 // 4. devuelve el resultado
}
```

El enunciado sugiere validar antes del permiso; en este código el permiso va primero en los servicios de administrador, para que un vendedor reciba siempre `403` y nunca vea los detalles de validación. Las dos formas cumplen la regla, porque ambas pasan antes de tocar la base.

## Árbol completo

```text
sistema-comercial/
├── .env.example              Variables de entorno de ejemplo (se copia a .env)
├── drizzle.config.ts         Configuración de drizzle-kit (local o Turso según la URL)
├── next.config.ts            Configuración de Next.js
├── drizzle/                  Migraciones SQL generadas por drizzle-kit
├── scripts/probar-api.sh     50 pruebas automáticas de la API
├── docs/                     Esta documentación
└── src/
    ├── proxy.ts              Barrera 1: sin cookie → /login
    ├── db/
    │   ├── schema.ts         Las 9 tablas
    │   ├── index.ts          Conexión (SQLite local o Turso)
    │   ├── seed.ts           Datos iniciales, creados con los servicios
    │   └── verificar.ts      Comprueba que stock y saldos cuadren
    ├── servicios/            ★ Reglas de negocio
    │   ├── auth.ts           Login, sesión, cambio de contraseña
    │   ├── usuarios.ts       Gestión de usuarios (admin)
    │   ├── categorias.ts
    │   ├── productos.ts
    │   ├── stock.ts          moverStock(): ÚNICO lugar que cambia la existencia
    │   ├── clientes.ts       Clientes, saldo y cuenta corriente
    │   ├── pagos.ts          Pagos y recibos
    │   ├── facturas.ts       Venta, listado, comprobante y anulación
    │   └── tablero.ts        Indicadores y gráficos
    ├── lib/
    │   ├── api.ts            Envoltorio ruta(): sesión, JSON y errores de las 31 rutas
    │   ├── sesion.ts         Cookie firmada, usuarioActual(), exigirUsuario()
    │   ├── esquemas.ts       Esquemas Zod compartidos (formulario + servidor)
    │   ├── validar.ts        validar(): Zod → error 422 con detalle por campo
    │   ├── errores.ts        Clase ApiError y atajos
    │   ├── tipos.ts          Tipo Usuario, exigirAdmin(), paginacion()
    │   ├── formato.ts        Único módulo de formatos: moneda, fechas, números
    │   ├── fechas.ts         Días en hora de Argentina
    │   ├── config.ts         Punto de venta y datos del comercio
    │   ├── cliente-api.ts    api(): fetch desde el navegador
    │   ├── paginas.ts        Ayudas para las páginas (404, filtros de la URL)
    │   └── utils.ts          cn() de shadcn
    ├── hooks/
    │   └── use-formulario.ts Errores por campo, "enviando" y avisos
    ├── components/
    │   ├── ui/               Componentes de shadcn/ui (generados con su CLI)
    │   ├── comunes/          Reutilizables: encabezado, estados, paginador, filtros…
    │   ├── layout/           Panel lateral y barra superior
    │   ├── auth/ tablero/ productos/ clientes/ ventas/ usuarios/
    └── app/
        ├── layout.tsx        HTML raíz, fuente y avisos
        ├── login/            Página pública
        ├── (sistema)/        Grupo de rutas con panel lateral (no aparece en la URL)
        │   ├── layout.tsx    Barrera 2: exigirUsuario()
        │   ├── loading.tsx   Estado "cargando" de todas las páginas
        │   ├── error.tsx     Estado "error" de todas las páginas
        │   ├── page.tsx      / (tablero)
        │   ├── ventas/       /ventas, /ventas/nueva, /ventas/[id]
        │   ├── productos/    /productos, /productos/[id], /existencias, /categorias
        │   ├── clientes/     /clientes, /clientes/[id], /clientes/saldos
        │   ├── clientes/recibos/[id]  Recibo de pago
        │   ├── usuarios/     Solo admin
        │   └── perfil/       Cambio de contraseña
        └── api/              31 endpoints (ver 06-api-rest.md)
```

## Conceptos de Next.js que aparecen

| Concepto | Dónde | Para qué |
| --- | --- | --- |
| Enrutamiento por archivos | `app/**/page.tsx` | Cada carpeta es una parte de la URL |
| Segmento dinámico `[id]` | `productos/[id]/page.tsx` | `/productos/7` llega con `params.id = "7"` |
| Grupo de rutas `(sistema)` | `app/(sistema)/` | Comparte el layout sin agregar `/sistema` a la URL |
| Layout | `(sistema)/layout.tsx` | Panel lateral común a todas las pantallas |
| `loading.tsx` / `error.tsx` | `(sistema)/` | Estados de carga y error automáticos |
| Route Handler | `app/api/**/route.ts` | Exporta `GET`, `POST`, `PATCH`, `PUT` |
| Proxy (antes "middleware") | `src/proxy.ts` | Se ejecuta antes de cada página |
| Server Component | Páginas sin `"use client"` | Corren en el servidor y pueden llamar a los servicios |
| Client Component | Archivos con `"use client"` | Tienen estado e interacción (formularios, diálogos) |
