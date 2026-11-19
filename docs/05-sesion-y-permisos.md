# 5. Sesión, seguridad y permisos

## Cómo funciona la sesión

Se usa una **sesión propia en cookie firmada** (opción sugerida en la sección 9). Todo está en [`src/lib/sesion.ts`](../src/lib/sesion.ts).

1. El usuario manda email y contraseña a `POST /api/auth/login`.
2. El servicio `login` ([`servicios/auth.ts`](../src/servicios/auth.ts)) busca el usuario y compara la contraseña con bcrypt.
3. Si está bien, `abrirSesion` guarda una cookie llamada `sesion` con este contenido:

   ```text
   <idUsuario>.<vencimiento>.<firma>
   ```

   La **firma** es un HMAC-SHA256 del id y el vencimiento, calculado con el secreto `SESSION_SECRET`. Si alguien edita la cookie para cambiar su id por el del admin, la firma ya no coincide y la sesión se rechaza. Sin conocer el secreto no se puede fabricar una firma válida.
4. La cookie es:
   - `httpOnly`: el JavaScript de la página no la puede leer (protege contra robo por XSS).
   - `sameSite: lax`: no se envía desde formularios de otros sitios.
   - `secure` en producción: solo viaja por HTTPS.
   - Vence a las 12 horas.

## Las tres barreras (sección 10.5)

| Barrera | Archivo | Qué hace |
| --- | --- | --- |
| 1. Proxy | [`src/proxy.ts`](../src/proxy.ts) | Si no hay cookie, redirige a `/login` antes de mostrar la página. No valida la firma (es solo un filtro rápido) |
| 2. Página | [`app/(sistema)/layout.tsx`](../src/app/(sistema)/layout.tsx) → `exigirUsuario()` | Verifica la firma y busca el usuario en la base. Si no es válido, redirige a `/login` |
| 3. Servicio | `exigirAdmin(usuario)` en cada servicio de admin | Verifica el rol. Responde `403` aunque se llame a la API directamente |

En la API, el envoltorio `ruta()` ([`lib/api.ts`](../src/lib/api.ts)) llama a `usuarioActual()` en cada pedido y responde `401 NO_AUTENTICADO` si no hay sesión válida. La única ruta pública es `POST /api/auth/login`.

### ¿Alcanza con ocultar el botón?

No. El vendedor no ve "Usuarios" en el menú ni el botón "Nuevo producto", pero eso es solo una ayuda visual. Si usa la API directamente:

```bash
curl -X POST http://localhost:3000/api/productos -b "sesion=<cookie del vendedor>" \
     -H "Content-Type: application/json" -d '{"codigo":"X"}'
# → 403 {"error":{"code":"SIN_PERMISO","message":"No tenés permiso para realizar esta operación."}}
```

El `403` lo da `exigirAdmin` dentro del servicio, antes de validar o tocar la base.

### ¿Qué pasa si se desactiva a un usuario que tiene la sesión abierta?

En cada pedido, `usuarioActual()` busca al usuario **en la base** (`usuarioDeSesion` en `servicios/auth.ts`). Si está inactivo, devuelve `null`: el siguiente pedido a la API da `401` y la siguiente página lo manda a `/login`, aunque todavía tenga la cookie. Lo mismo con el rol: si le cambian el rol, el cambio rige en el siguiente pedido.

## Contraseñas

- Se guardan con **bcrypt** (`hashear` en `servicios/auth.ts`, costo 10). El hash no se puede revertir; para comprobar una contraseña se usa `bcrypt.compare`.
- La API nunca devuelve el hash: los servicios eligen las columnas a devolver.
- El login responde el mismo mensaje si el email no existe, si la contraseña es incorrecta o si el usuario está inactivo, para no dar pistas.
- El admin puede restablecer una contraseña (`restablecerPassword`): genera una temporal que se muestra una sola vez.

## El secreto de la sesión

- Está en la variable de entorno `SESSION_SECRET`.
- En local, en el archivo `.env` (que está en `.gitignore`, no se sube).
- En producción, en la configuración de Vercel.
- **No está en el repositorio** porque cualquiera con acceso al código podría firmar cookies falsas y entrar como administrador. Si `SESSION_SECRET` falta o tiene menos de 32 caracteres, la app da un error en lugar de funcionar insegura.

Para generar uno:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## La tarjeta de crédito

**No se ingresa el número completo en ninguna parte.** La pantalla de venta solo pide tipo, marca y los **últimos 4 dígitos** (regla 9). En el servidor, `esquemaTarjeta` es estricto: si alguien manda un campo de más (por ejemplo `numero`), la API responde `422`. La tabla `facturas` solo tiene `tarjeta_tipo`, `tarjeta_marca` y `tarjeta_ultimos4`.
