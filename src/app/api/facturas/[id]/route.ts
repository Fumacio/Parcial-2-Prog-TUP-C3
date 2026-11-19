// GET /api/facturas/{id} (RF-V7): la factura completa.
import { idDe, ruta } from "@/lib/api";
import { obtenerFactura } from "@/servicios/facturas";

export const GET = ruta(({ usuario, params }) => obtenerFactura(usuario, idDe(params)));
