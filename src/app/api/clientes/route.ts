// GET y POST /api/clientes (RF-C1, RF-C2, RF-C6 y alta rápida RF-V2).
import { ruta } from "@/lib/api";
import { crearCliente, listarClientes } from "@/servicios/clientes";

export const GET = ruta(({ usuario, query }) => listarClientes(usuario, query));
export const POST = ruta(({ usuario, body }) => crearCliente(usuario, body), { status: 201 });
