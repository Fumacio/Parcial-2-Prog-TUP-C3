// POST /api/auth/login (RF-U1). Única ruta pública de la API.
import { ruta } from "@/lib/api";
import { abrirSesion } from "@/lib/sesion";
import { login } from "@/servicios/auth";

export const POST = ruta(
  async ({ body }) => {
    const usuario = await login(body);
    await abrirSesion(usuario.id); // deja la cookie httpOnly en Set-Cookie
    return usuario;
  },
  { publica: true },
);
