// Servicio de usuarios (solo administrador). RF-U3, RF-U4, RF-U5.
import { randomBytes } from "crypto";
import { and, asc, eq, like, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { conflicto, noEncontrado, reglaNegocio } from "@/lib/errores";
import { esquemaUsuarioAlta, esquemaUsuarioEdicion } from "@/lib/esquemas";
import { exigirAdmin, paginacion, type Filtros, type Usuario } from "@/lib/tipos";
import { validar } from "@/lib/validar";
import { hashear } from "./auth";

// Columnas que se devuelven: nunca el hash de la contraseña
const columnas = {
  id: usuarios.id,
  nombre: usuarios.nombre,
  email: usuarios.email,
  rol: usuarios.rol,
  activo: usuarios.activo,
  creadoEn: usuarios.creadoEn,
};

/** RF-U4: listado con búsqueda (q) y filtro activo=true/false. */
export async function listarUsuarios(usuario: Usuario, filtros: Filtros) {
  exigirAdmin(usuario);
  const { page, pageSize, offset } = paginacion(filtros);

  const condiciones: SQL[] = [];
  if (filtros.q) {
    condiciones.push(or(like(usuarios.nombre, `%${filtros.q}%`), like(usuarios.email, `%${filtros.q}%`))!);
  }
  if (filtros.activo === "true") condiciones.push(eq(usuarios.activo, true));
  if (filtros.activo === "false") condiciones.push(eq(usuarios.activo, false));
  const where = and(...condiciones);

  const data = await db
    .select(columnas)
    .from(usuarios)
    .where(where)
    .orderBy(asc(usuarios.nombre))
    .limit(pageSize)
    .offset(offset);
  const total = await db.$count(usuarios, where);
  return { data, page, pageSize, total };
}

/** Solo id y nombre de todos los usuarios: para el filtro "vendedor" del listado de facturas (ambos roles). */
export async function listarVendedores(_usuario: Usuario) {
  return db.select({ id: usuarios.id, nombre: usuarios.nombre }).from(usuarios).orderBy(asc(usuarios.nombre));
}

async function emailEnUso(email: string, excepto?: number) {
  const [otro] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email));
  return otro && otro.id !== excepto;
}

/** RF-U4: alta de usuario con contraseña temporal. */
export async function crearUsuario(usuario: Usuario, datos: unknown) {
  exigirAdmin(usuario);
  const d = validar(esquemaUsuarioAlta, datos);
  const email = d.email.toLowerCase();
  if (await emailEnUso(email)) throw conflicto("EMAIL_DUPLICADO", "Ya existe un usuario con ese email.");

  const [nuevo] = await db
    .insert(usuarios)
    .values({ nombre: d.nombre, email, rol: d.rol, passwordHash: await hashear(d.password) })
    .returning(columnas);
  return nuevo;
}

/** RF-U4: edición, cambio de rol y desactivación (baja lógica, regla 12). */
export async function editarUsuario(usuario: Usuario, id: number, datos: unknown) {
  exigirAdmin(usuario);
  const d = validar(esquemaUsuarioEdicion, datos);

  const [actual] = await db.select(columnas).from(usuarios).where(eq(usuarios.id, id));
  if (!actual) throw noEncontrado("El usuario");

  // Un admin no puede desactivarse ni quitarse el rol a sí mismo (se quedaría sin administrador)
  if (id === usuario.id && (d.activo === false || d.rol === "vendedor")) {
    throw reglaNegocio("OPERACION_SOBRE_SI_MISMO", "No podés desactivarte ni quitarte el rol de administrador.");
  }
  if (d.email) {
    d.email = d.email.toLowerCase();
    if (await emailEnUso(d.email, id)) throw conflicto("EMAIL_DUPLICADO", "Ya existe un usuario con ese email.");
  }

  const [editado] = await db.update(usuarios).set(d).where(eq(usuarios.id, id)).returning(columnas);
  return editado;
}

/** RF-U5: el admin restablece la contraseña. Se muestra una sola vez. */
export async function restablecerPassword(usuario: Usuario, id: number) {
  exigirAdmin(usuario);
  const [actual] = await db.select(columnas).from(usuarios).where(eq(usuarios.id, id));
  if (!actual) throw noEncontrado("El usuario");

  const passwordTemporal = randomBytes(6).toString("base64url"); // 8 caracteres
  await db
    .update(usuarios)
    .set({ passwordHash: await hashear(passwordTemporal) })
    .where(eq(usuarios.id, id));
  return { passwordTemporal };
}
