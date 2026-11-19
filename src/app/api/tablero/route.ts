// GET /api/tablero (RF-T1 a RF-T3).
import { ruta } from "@/lib/api";
import { resumenTablero } from "@/servicios/tablero";

export const GET = ruta(({ usuario }) => resumenTablero(usuario));
