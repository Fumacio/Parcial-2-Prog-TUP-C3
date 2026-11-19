# 8. Publicación en Vercel y Turso

Esto lo tiene que hacer el grupo con sus cuentas (Vercel y Turso tienen planes gratuitos).

## 1. Subir el código a GitHub

```bash
git add .
git commit -m "Sistema de gestión comercial"
git branch -M main
git remote add origin https://github.com/<usuario>/<repositorio>.git
git push -u origin main
```

Revisar antes que **no** se suban `.env` ni `local.db` (están en `.gitignore`).

## 2. Crear la base en Turso

Instalar la CLI de Turso ([docs.turso.tech/cli](https://docs.turso.tech/cli/introduction)). En Windows conviene usarla desde WSL.

```bash
turso auth login
turso db create sistema-comercial
turso db show sistema-comercial --url        # → libsql://sistema-comercial-<usuario>.turso.io
turso db tokens create sistema-comercial     # → un token largo
```

También se puede hacer desde la web de Turso: crear la base y, en su página, copiar la URL y generar un token.

## 3. Crear las tablas y cargar los datos en Turso

Desde la computadora, apuntando temporalmente a Turso. En bash:

```bash
DATABASE_URL="libsql://sistema-comercial-<usuario>.turso.io" \
DATABASE_AUTH_TOKEN="<token>" \
pnpm run db:migrate

DATABASE_URL="libsql://sistema-comercial-<usuario>.turso.io" \
DATABASE_AUTH_TOKEN="<token>" \
pnpm run db:seed
```

En PowerShell:

```powershell
$env:DATABASE_URL = "libsql://sistema-comercial-<usuario>.turso.io"
$env:DATABASE_AUTH_TOKEN = "<token>"
pnpm run db:migrate
pnpm run db:seed
Remove-Item Env:DATABASE_URL, Env:DATABASE_AUTH_TOKEN
```

`drizzle.config.ts` detecta que la URL no empieza con `file:` y usa el modo Turso (con token). Las mismas migraciones de la carpeta `drizzle/` crean las mismas tablas que en local.

> Las variables de la terminal tienen prioridad sobre las del archivo `.env`, por eso no hace falta editarlo.

## 4. Crear el proyecto en Vercel

1. Entrar a [vercel.com](https://vercel.com) → **Add New… → Project** → importar el repositorio de GitHub.
2. Vercel detecta Next.js y pnpm solo.
3. En **Environment Variables** cargar:

   | Nombre | Valor |
   | --- | --- |
   | `DATABASE_URL` | `libsql://sistema-comercial-<usuario>.turso.io` |
   | `DATABASE_AUTH_TOKEN` | el token de Turso |
   | `SESSION_SECRET` | un texto aleatorio nuevo (ver abajo) |

   Para generar el secreto:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. **Deploy**. Al terminar, Vercel da la URL pública (`https://<proyecto>.vercel.app`).

Cada `git push` a `main` vuelve a publicar automáticamente.

## 5. Probar en línea

1. Entrar a la URL pública con `laura@ferreteria.test` / `admin1234`.
2. Hacer el recorrido de la defensa: venta a consumidor final en efectivo, venta a un cliente nuevo en cuenta corriente, pago de ese cliente y anulación de una factura. Revisar stock y saldo después de cada paso.

### ¿Cómo se comprueba que usa Turso y no una base local?

- En Vercel no hay archivo `local.db`: el sistema de archivos de Vercel no se puede usar como base. Si `DATABASE_URL` no estuviera cargada, la app fallaría al leer datos.
- Crear algo en el sitio publicado (por ejemplo una categoría) y verlo en Turso:
  ```bash
  turso db shell sistema-comercial "select * from categorias order by id desc limit 3"
  ```
- O mirar las tablas en el panel web de Turso.

## 6. Completar el README

Agregar integrantes, la URL pública y la del repositorio en `README.md`, hacer commit y push.

## Si cambia el esquema después de publicar

1. `pnpm run db:generate` (crea la migración nueva).
2. Commit y push (Vercel publica el código nuevo).
3. Correr `pnpm run db:migrate` con las variables de Turso, como en el paso 3.
