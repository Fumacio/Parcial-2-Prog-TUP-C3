// Servicio de autenticación: login, usuario de la sesión y cambio de contraseña.
// No sabe nada de cookies ni de HTTP: eso lo hace el adaptador (src/lib/api.ts y las rutas).
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { ApiError, reglaNegocio } from "@/lib/errores";
import { esquemaCambioPassword, esquemaLogin } from "@/lib/esquemas";
import type { Usuario } from "@/lib/tipos";
import { validar } from "@/lib/validar";

/** Las contraseñas se guardan con hash bcrypt, nunca en texto plano. */
export const hashear = (password: string) => bcrypt.hash(password, 10);

/** Forma pública del usuario: sin el hash de la contraseña. */
export function usuarioPublico(u: typeof usuarios.$inferSelect): Usuario {
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol };
}

/** RF-U1: inicio de sesión. El mensaje de error es el mismo en los 3 casos (no da pistas). */
export async function login(datos: unknown): Promise<Usuario> {
  const { email, password } = validar(esquemaLogin, datos);
  const [u] = await db.select().from(usuarios).where(eq(usuarios.email, email.toLowerCase()));

  const valido = u && u.activo && (await bcrypt.compare(password, u.passwordHash));
  if (!valido) {
    throw new ApiError(401, "CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos.");
  }
  return usuarioPublico(u);
}

/**
 * RF-U2 / RF-U4: se llama en CADA pedido con el id que viene en la cookie.
 * Si el usuario fue desactivado, devuelve null y pierde el acceso aunque tenga la cookie.
 */
export async function usuarioDeSesion(id: number): Promise<Usuario | null> {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, id));
  if (!u || !u.activo) return null;
  return usuarioPublico(u);
}

/** RF-U5: cada usuario cambia su propia contraseña. */
export async function cambiarPassword(usuario: Usuario, datos: unknown) {
  const { actual, nueva } = validar(esquemaCambioPassword, datos);
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, usuario.id));

  if (!(await bcrypt.compare(actual, u.passwordHash))) {
    throw reglaNegocio("CONTRASENA_ACTUAL_INCORRECTA", "La contraseña actual no es correcta.");
  }
  await db
    .update(usuarios)
    .set({ passwordHash: await hashear(nueva) })
    .where(eq(usuarios.id, usuario.id));
}
