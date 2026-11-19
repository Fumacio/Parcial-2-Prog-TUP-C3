// Cálculos de días en hora de Argentina (UTC−3, sin horario de verano).
// Los filtros `desde` y `hasta` llegan como "AAAA-MM-DD" (sección 11.1).

const OFFSET = "-03:00";

/** Comienzo del día en Argentina: "2026-10-29" -> 2026-10-29T03:00:00Z */
export function inicioDia(dia: string): Date {
  return new Date(`${dia}T00:00:00${OFFSET}`);
}

/** Comienzo del día SIGUIENTE (sirve como límite exclusivo de "hasta"). */
export function finDia(dia: string): Date {
  const d = inicioDia(dia);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/** Día de hoy en Argentina como "AAAA-MM-DD" */
export function hoy(): string {
  return diaDe(new Date());
}

/** Convierte una fecha a "AAAA-MM-DD" en hora de Argentina */
export function diaDe(fecha: Date): string {
  return fecha.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
}

/** Suma (o resta) días a un "AAAA-MM-DD" */
export function sumarDias(dia: string, dias: number): string {
  const d = inicioDia(dia);
  d.setUTCDate(d.getUTCDate() + dias);
  return diaDe(d);
}

/** Primer día del mes de un "AAAA-MM-DD": "2026-10-29" -> "2026-10-01" */
export function inicioMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`;
}
