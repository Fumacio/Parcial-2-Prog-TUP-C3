// POST /api/clientes/{id}/pagos (RF-C5): registrar un pago.
import { idDe, ruta } from "@/lib/api";
import { registrarPago } from "@/servicios/pagos";

export const POST = ruta(({ usuario, params, body }) => registrarPago(usuario, idDe(params), body), {
  status: 201,
});
