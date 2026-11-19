// GET y POST /api/facturas (RF-V1 a RF-V8).
import { ruta } from "@/lib/api";
import { crearFactura, listarFacturas } from "@/servicios/facturas";

export const GET = ruta(({ usuario, query }) => listarFacturas(usuario, query));
export const POST = ruta(({ usuario, body }) => crearFactura(usuario, body), { status: 201 });
