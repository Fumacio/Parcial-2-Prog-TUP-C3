// GET y PATCH /api/clientes/{id} (RF-C2, RF-C3, RF-C7).
import { idDe, ruta } from "@/lib/api";
import { editarCliente, obtenerCliente } from "@/servicios/clientes";

export const GET = ruta(({ usuario, params }) => obtenerCliente(usuario, idDe(params)));
export const PATCH = ruta(({ usuario, params, body }) => editarCliente(usuario, idDe(params), body));
