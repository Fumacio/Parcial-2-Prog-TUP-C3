// Estados de un listado (sección 8: "cada listado contempla carga, vacío y error").
import { AlertCircle, Inbox } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

/** Mientras carga: renglones grises animados. Se usa en los archivos loading.tsx */
export function Cargando({ renglones = 6 }: { renglones?: number }) {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: renglones }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}

/** Cuando no hay datos. */
export function Vacio({ mensaje = "No hay datos para mostrar." }: { mensaje?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
      <Inbox className="size-8" />
      <span className="text-sm">{mensaje}</span>
    </div>
  );
}

/** Vacío dentro de una tabla: ocupa todas las columnas. */
export function FilaVacia({ columnas, mensaje }: { columnas: number; mensaje?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={columnas}>
        <Vacio mensaje={mensaje} />
      </TableCell>
    </TableRow>
  );
}

/** Cuando algo falla. */
export function MensajeError({ mensaje, children }: { mensaje: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 py-10 text-destructive">
      <AlertCircle className="size-8" />
      <span className="text-sm font-medium">{mensaje}</span>
      {children}
    </div>
  );
}
