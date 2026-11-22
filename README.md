# Sistema de gestión comercial

Segundo parcial de **Programación IV: Desarrollo Web**. Sistema para un comercio minorista de un solo local: **facturación**, **control de stock** y **cuenta corriente de clientes**, con usuarios, roles y un tablero de inicio con gráficos.

| | |
| --- | --- |
| **Grupo** | 22 |
| **Integrantes** | Pablo Ignacio Flores (63586) · Lourdes Micaela Andrada Romero (63624) · Valentín González Patti (61595) |
| **URL pública** | <https://parcial-2-prog-tup-c3.vercel.app> |
| **Repositorio** | <https://github.com/Fumacio/Parcial-2-Prog-TUP-C3> |

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Lenguaje | TypeScript |
| Framework | Next.js 16 (App Router, enrutamiento por archivos) |
| API | REST con Route Handlers (`src/app/api/**/route.ts`) |
| Interfaz | React 19, shadcn/ui y Tailwind CSS 4 |
| Gráficos | Chart.js con `react-chartjs-2` |
| Base de datos | SQLite en desarrollo, Turso (libSQL) en producción |
| Acceso a datos | Drizzle ORM y migraciones con `drizzle-kit` |
| Validación | Zod, con los mismos esquemas en el formulario y en el servidor |
| Sesión | Propia, en una cookie `httpOnly` firmada con HMAC. Contraseñas con bcrypt |
| Hosting | Vercel (app) y Turso (base de datos) |

## Instalación local

Hace falta Node.js 20 o superior y pnpm (`npm install -g pnpm`).

```bash
pnpm install
cp .env.example .env
pnpm run db:migrate
pnpm run db:seed
pnpm run dev
```

Después se abre <http://localhost:3000>.

> En Windows con PowerShell, el segundo paso es `Copy-Item .env.example .env`.

### Para empezar de cero con la base local

Borrar el archivo `local.db` y volver a correr `pnpm run db:migrate` y `pnpm run db:seed`.

## Variables de entorno

Están en el archivo [`.env.example`](.env.example).

| Variable | Local | Producción (Vercel) |
| --- | --- | --- |
| `DATABASE_URL` | `file:local.db` | `libsql://<base>-<usuario>.turso.io` |
| `DATABASE_AUTH_TOKEN` | vacío | token de Turso (`turso db tokens create <base>`) |
| `SESSION_SECRET` | cualquier texto de 32 caracteres o más | texto aleatorio largo, distinto del de local |

## Usuarios de prueba

| Rol | Email | Contraseña |
| --- | --- | --- |
| Administrador | `laura@ferreteria.test` | `admin1234` |
| Vendedor | `pablo@ferreteria.test` | `vendedor1234` |

**Modo demo:** en el login hay dos botones, **Administrador** y **Vendedor**, que entran con estos usuarios sin escribir nada.

Los datos iniciales cargan 2 usuarios, 5 categorías, 30 productos, 10 clientes, 50 facturas de los últimos 30 días, 4 pagos y 1 anulación.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `pnpm run dev` | Levanta la app en modo desarrollo |
| `pnpm run build` / `pnpm start` | Compila y levanta la versión de producción |
| `pnpm run db:generate` | Crea una migración nueva después de cambiar `src/db/schema.ts` |
| `pnpm run db:migrate` | Aplica las migraciones a la base de `DATABASE_URL` |
| `pnpm run db:seed` | Carga los datos de prueba (solo si la base está vacía) |
| `pnpm run db:verificar` | Comprueba que el stock cuadre con sus movimientos y los saldos con la cuenta corriente |
| `pnpm run probar:api` | Corre 50 pruebas contra la API (con la app levantada en el puerto 3000) |
| `pnpm run db:studio` | Abre Drizzle Studio para ver las tablas |

## Estructura

```text
src/
├── app/                 Páginas y API (App Router)
│   ├── (sistema)/       Pantallas con panel lateral (requieren sesión)
│   ├── login/           Única página pública
│   └── api/             API REST: 31 endpoints en 23 archivos route.ts
├── servicios/           Reglas de negocio (una carpeta, un módulo por tema)
├── db/                  Esquema, conexión, datos iniciales y verificación
├── lib/                 Sesión, errores, esquemas Zod, formatos y ayudas
├── components/          Componentes de interfaz (ui = shadcn, comunes, por módulo)
├── hooks/               Hook de formularios
└── proxy.ts             Primera barrera: redirige al login si no hay cookie
drizzle/                 Migraciones SQL generadas
docs/                    Documentación paso a paso
scripts/                 Pruebas de la API
```

## Documentación

La carpeta [`docs/`](docs) explica cada parte del sistema:

1. [Plan y requisitos del parcial](docs/01-plan-y-requisitos.md)
2. [Estructura de carpetas y capas](docs/02-estructura-y-capas.md)
3. [Base de datos y migraciones](docs/03-base-de-datos.md)
4. [Servicios y reglas de negocio](docs/04-servicios-y-reglas.md)
5. [Sesión, seguridad y permisos](docs/05-sesion-y-permisos.md)
6. [API REST](docs/06-api-rest.md)
7. [Pantallas](docs/07-pantallas.md)
8. [Publicación en Vercel y Turso](docs/08-publicacion.md)
9. [Guía para la defensa](docs/09-defensa.md)
10. [Bitácora de desarrollo](docs/10-bitacora.md)

## Requerimientos cumplidos

Cada función de `src/servicios/` tiene un comentario con el requerimiento (RF-…) o la regla que implementa. La tabla completa está en [docs/01-plan-y-requisitos.md](docs/01-plan-y-requisitos.md).
