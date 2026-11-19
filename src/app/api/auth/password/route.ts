// PUT /api/auth/password (RF-U5): cambiar la propia contraseña. Responde 204.
import { ruta } from "@/lib/api";
import { cambiarPassword } from "@/servicios/auth";

export const PUT = ruta(async ({ usuario, body }) => {
  await cambiarPassword(usuario, body);
});
