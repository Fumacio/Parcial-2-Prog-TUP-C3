// PATCH /api/usuarios/{id} (RF-U4): editar, cambiar rol o desactivar.
import { idDe, ruta } from "@/lib/api";
import { editarUsuario } from "@/servicios/usuarios";

export const PATCH = ruta(({ usuario, params, body }) => editarUsuario(usuario, idDe(params), body));
