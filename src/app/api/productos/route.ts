// GET y POST /api/productos (RF-P1, RF-P2).
import { ruta } from "@/lib/api";
import { crearProducto, listarProductos } from "@/servicios/productos";

export const GET = ruta(({ usuario, query }) => listarProductos(usuario, query));
export const POST = ruta(({ usuario, body }) => crearProducto(usuario, body), { status: 201 });
