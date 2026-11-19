// Sesión propia en una cookie FIRMADA (sección 9: "sesión propia en cookie firmada").
//
// La cookie guarda:  <idUsuario>.<vencimiento>.<firma>
// La firma es un HMAC-SHA256 hecho con SESSION_SECRET. Si alguien cambia el id
// en la cookie, la firma deja de coincidir y la sesión se rechaza.
// El secreto vive en la variable de entorno SESSION_SECRET (nunca en el repositorio).
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { usuarioDeSesion } from "@/servicios/auth";
import type { Usuario } from "./tipos";

export const COOKIE_SESION = "sesion";
const DURACION_MS = 1000 * 60 * 60 * 12; // 12 horas

function secreto() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres) en las variables de entorno.");
  return s;
}

function firmar(texto: string) {
  return createHmac("sha256", secreto()).update(texto).digest("base64url");
}

/** Crea el valor de la cookie para un usuario. */
export function crearToken(usuarioId: number) {
  const contenido = `${usuarioId}.${Date.now() + DURACION_MS}`;
  return `${contenido}.${firmar(contenido)}`;
}

/** Devuelve el id de usuario si la firma es válida y no venció; si no, null. */
export function leerToken(token: string | undefined): number | null {
  if (!token) return null;
  const [id, vence, firma] = token.split(".");
  if (!id || !vence || !firma) return null;

  const esperada = Buffer.from(firmar(`${id}.${vence}`));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return null;
  if (Number(vence) < Date.now()) return null;
  return Number(id);
}

/** Guarda la cookie httpOnly (el JavaScript del navegador no la puede leer). */
export async function abrirSesion(usuarioId: number) {
  (await cookies()).set(COOKIE_SESION, crearToken(usuarioId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_MS / 1000,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE_SESION);
}

/**
 * Usuario conectado. Se busca en la base EN CADA PEDIDO: si lo desactivaron,
 * pierde el acceso enseguida aunque todavía tenga la cookie (sección 10.5).
 */
export async function usuarioActual(): Promise<Usuario | null> {
  const id = leerToken((await cookies()).get(COOKIE_SESION)?.value);
  if (!id) return null;
  return usuarioDeSesion(id);
}

/** Para las páginas: si no hay sesión válida, manda al login (segunda barrera). */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  return usuario;
}
