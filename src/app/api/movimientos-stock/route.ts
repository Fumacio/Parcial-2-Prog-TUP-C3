// GET /api/movimientos-stock (RF-P6): historial de todos los productos.
import { ruta } from "@/lib/api";
import { listarMovimientos } from "@/servicios/stock";

export const GET = ruta(({ usuario, query }) => listarMovimientos(usuario, query));
