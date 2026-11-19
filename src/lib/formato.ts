// Único módulo de formatos (sección 10.6). Los componentes NO formatean por su cuenta.
// Moneda: $ 12.345,50 · Fechas: dd/mm/aaaa · Hora de Argentina.

const ZONA = "America/Argentina/Buenos_Aires";

const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

/** Recibe centavos (entero) y devuelve "$ 12.345,50" */
export function moneda(centavos: number | null | undefined): string {
  if (centavos == null) return "—";
  return formatoMoneda.format(centavos / 100).replace(/ /g, " ");
}

/** "29/10/2026" */
export function fecha(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  return new Date(valor).toLocaleDateString("es-AR", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** "29/10/2026 15:24" */
export function fechaHora(valor: Date | string | null | undefined): string {
  if (!valor) return "—";
  const d = new Date(valor);
  const hora = d.toLocaleTimeString("es-AR", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${fecha(d)} ${hora}`;
}

/** "Martes, 10 de noviembre" (encabezado del tablero) */
export function fechaLarga(valor: Date): string {
  const texto = valor.toLocaleDateString("es-AR", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Número de factura: 0001-00001233 (regla 4) */
export function numeroFactura(puntoVenta: number, numero: number): string {
  return `${String(puntoVenta).padStart(4, "0")}-${String(numero).padStart(8, "0")}`;
}

/** Número de recibo: R 0001-00000341 */
export function numeroRecibo(puntoVenta: number, numero: number): string {
  return `R ${numeroFactura(puntoVenta, numero)}`;
}

/** "DNI 28.456.123" */
export function documento(tipoDoc: string, nroDoc: string): string {
  return `${tipoDoc} ${nroDoc}`;
}

/** Convierte lo que escribe el usuario en pesos ("12345,50" o "12345.5") a centavos. */
export function pesosACentavos(texto: string): number {
  const limpio = texto.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(limpio);
  if (texto.trim() === "" || Number.isNaN(n)) return NaN;
  return Math.round(n * 100);
}

/** Centavos a texto editable en pesos: 1234550 -> "12345,50" */
export function centavosAPesos(centavos: number | null | undefined): string {
  if (centavos == null) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

export const nombresFormaPago: Record<string, string> = {
  contado: "Contado",
  tarjeta: "Tarjeta",
  cuenta_corriente: "Cuenta corriente",
};

export const nombresMedioPago: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta_debito: "Tarjeta de débito",
};
