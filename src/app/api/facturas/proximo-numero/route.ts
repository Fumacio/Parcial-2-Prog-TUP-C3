// GET /api/facturas/proximo-numero (RF-V1). Solo informativo.
// Al ser un segmento fijo, tiene prioridad sobre /api/facturas/[id].
import { ruta } from "@/lib/api";
import { proximoNumero } from "@/servicios/facturas";

export const GET = ruta(({ usuario }) => proximoNumero(usuario));
