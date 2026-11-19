// POST /api/usuarios/{id}/reset-password (RF-U5): contraseña temporal.
import { idDe, ruta } from "@/lib/api";
import { restablecerPassword } from "@/servicios/usuarios";

export const POST = ruta(({ usuario, params }) => restablecerPassword(usuario, idDe(params)));
