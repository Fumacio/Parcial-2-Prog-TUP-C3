// GET /api/clientes/{id}/cuenta (RF-C4): cuenta corriente con saldo acumulado.
import { idDe, ruta } from "@/lib/api";
import { cuentaCorriente } from "@/servicios/clientes";

export const GET = ruta(({ usuario, params, query }) => cuentaCorriente(usuario, idDe(params), query));
