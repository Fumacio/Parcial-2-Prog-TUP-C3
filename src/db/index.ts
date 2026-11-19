// Conexión a la base de datos.
//
// ¿Cómo sabe si usar la base local o la de Turso? Por la variable DATABASE_URL:
//   - en tu computadora:  DATABASE_URL=file:local.db           (SQLite en un archivo)
//   - en Vercel:          DATABASE_URL=libsql://xxx.turso.io    (Turso) + DATABASE_AUTH_TOKEN
// El mismo cliente (@libsql/client) sirve para los dos casos.

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL || "file:local.db",
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});

export const db = drizzle(client, { schema });

// Tipo de la transacción: lo usan las funciones que deben correr "dentro" de una.
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
