// Prueba la conexión con la base de DATABASE_URL / DATABASE_AUTH_TOKEN.
// La usa scripts/publicar.ps1 antes de migrar, para dar un error claro si algo falla.
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});

try {
  await client.execute("select 1");
  console.log("  Conexión OK");
} catch (error) {
  console.error("  No se pudo conectar:", error.message);
  process.exit(1);
}
