// PATCH /api/categorias/{id} (RF-P7): editar o desactivar.
import { idDe, ruta } from "@/lib/api";
import { editarCategoria } from "@/servicios/categorias";

export const PATCH = ruta(({ usuario, params, body }) => editarCategoria(usuario, idDe(params), body));
