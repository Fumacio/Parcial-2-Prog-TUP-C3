// GET /api/pagos/{id} (RF-C5): el recibo, para reimprimirlo.
import { idDe, ruta } from "@/lib/api";
import { obtenerPago } from "@/servicios/pagos";

export const GET = ruta(({ usuario, params }) => obtenerPago(usuario, idDe(params)));
