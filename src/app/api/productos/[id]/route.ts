// GET y PATCH /api/productos/{id} (RF-P1, RF-P2, RF-P3).
import { idDe, ruta } from "@/lib/api";
import { editarProducto, obtenerProducto } from "@/servicios/productos";

export const GET = ruta(({ usuario, params }) => obtenerProducto(usuario, idDe(params)));
export const PATCH = ruta(({ usuario, params, body }) => editarProducto(usuario, idDe(params), body));
