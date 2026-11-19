// GET y POST /api/productos/{id}/movimientos (RF-P4, RF-P5, RF-P6).
import { idDe, ruta } from "@/lib/api";
import { listarMovimientos, registrarMovimiento } from "@/servicios/stock";

export const GET = ruta(({ usuario, params, query }) =>
  listarMovimientos(usuario, { ...query, productoId: String(idDe(params)) }),
);
export const POST = ruta(({ usuario, params, body }) => registrarMovimiento(usuario, idDe(params), body), {
  status: 201,
});
