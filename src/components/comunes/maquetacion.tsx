// Primitivas de maquetación (sección 10.6): las páginas usan estos componentes
// en lugar de etiquetas HTML sueltas. Todo el estilo es con clases de Tailwind.
import { cn } from "@/lib/utils";

type Props = { children?: React.ReactNode; className?: string };

/** Apila elementos en vertical con separación. */
export function Pila({ children, className }: Props) {
  return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
}

/** Alinea elementos en horizontal (pasa a vertical si no entran). */
export function Fila({ children, className }: Props) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

/** Grilla adaptable: 1 columna en el celular, más en pantallas grandes. */
export function Grilla({ children, className, columnas = 4 }: Props & { columnas?: 2 | 3 | 4 }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columnas];
  return <div className={cn("grid grid-cols-1 gap-4", cols, className)}>{children}</div>;
}

export function Titulo({ children, className }: Props) {
  return <h2 className={cn("text-lg font-semibold", className)}>{children}</h2>;
}

export function Texto({ children, className, suave }: Props & { suave?: boolean }) {
  return <p className={cn("text-sm", suave && "text-muted-foreground", className)}>{children}</p>;
}

/** Par etiqueta/valor para fichas (por ejemplo "Teléfono: 381 455-2210"). */
export function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{etiqueta}</span>
      <div className="text-sm font-medium">{children ?? "—"}</div>
    </div>
  );
}
