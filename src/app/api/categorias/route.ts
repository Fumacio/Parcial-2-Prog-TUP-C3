// GET y POST /api/categorias (RF-P7).
import { ruta } from "@/lib/api";
import { crearCategoria, listarCategorias } from "@/servicios/categorias";

export const GET = ruta(({ usuario, query }) => listarCategorias(usuario, query));
export const POST = ruta(({ usuario, body }) => crearCategoria(usuario, body), { status: 201 });
