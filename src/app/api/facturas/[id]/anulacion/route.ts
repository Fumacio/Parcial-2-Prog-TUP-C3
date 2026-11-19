// POST /api/facturas/{id}/anulacion (RF-V9). Solo admin: lo verifica el servicio.
import { idDe, ruta } from "@/lib/api";
import { anularFactura } from "@/servicios/facturas";

export const POST = ruta(({ usuario, params, body }) => anularFactura(usuario, idDe(params), body));
