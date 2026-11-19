// GET y POST /api/usuarios (RF-U4). Solo admin: lo verifica el servicio.
import { ruta } from "@/lib/api";
import { crearUsuario, listarUsuarios } from "@/servicios/usuarios";

export const GET = ruta(({ usuario, query }) => listarUsuarios(usuario, query));
export const POST = ruta(({ usuario, body }) => crearUsuario(usuario, body), { status: 201 });
