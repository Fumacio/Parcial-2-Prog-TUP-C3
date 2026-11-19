// GET /api/auth/me (RF-U2): el usuario conectado.
import { ruta } from "@/lib/api";

export const GET = ruta(async ({ usuario }) => usuario);
