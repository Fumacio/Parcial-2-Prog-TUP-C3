import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "Cache Components" queda apagado: todas las páginas leen la sesión (cookie) y datos
  // que cambian todo el tiempo (stock, saldos), así que se generan en cada pedido.
  // Es el comportamiento más simple de entender para este sistema.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
