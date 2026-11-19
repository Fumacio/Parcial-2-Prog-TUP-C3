// Configuración de drizzle-kit: de dónde lee el esquema, dónde deja las migraciones
// y a qué base se conecta para aplicarlas (local o Turso, según DATABASE_URL).
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL || "file:local.db";
const esLocal = url.startsWith("file:");

export default defineConfig(
  esLocal
    ? // Local: archivo SQLite
      { schema: "./src/db/schema.ts", out: "./drizzle", dialect: "sqlite", dbCredentials: { url } }
    : // Producción: Turso (necesita el token)
      {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: { url, authToken: process.env.DATABASE_AUTH_TOKEN! },
      },
);
