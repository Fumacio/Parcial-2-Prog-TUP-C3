// POST /api/auth/logout (RF-U1): borra la cookie y responde 204.
import { ruta } from "@/lib/api";
import { cerrarSesion } from "@/lib/sesion";

export const POST = ruta(async () => {
  await cerrarSesion();
});
