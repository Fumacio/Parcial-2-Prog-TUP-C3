// Insignias de estado reutilizables.
import { Badge } from "@/components/ui/badge";
import { nombresFormaPago } from "@/lib/formato";

export function InsigniaEstado({ estado }: { estado: string }) {
  return estado === "anulada" ? (
    <Badge variant="destructive">Anulada</Badge>
  ) : (
    <Badge variant="secondary">Emitida</Badge>
  );
}

export function InsigniaActivo({ activo }: { activo: boolean }) {
  return activo ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>;
}

export function InsigniaFormaPago({ forma }: { forma: string }) {
  return <Badge variant="outline">{nombresFormaPago[forma] ?? forma}</Badge>;
}

/** "Bajo mínimo", o "6 · bajo mínimo" si se pasa la cantidad */
export function InsigniaBajoMinimo({ cantidad }: { cantidad?: number }) {
  return <Badge variant="destructive">{cantidad !== undefined ? `${cantidad} · bajo mínimo` : "Bajo mínimo"}</Badge>;
}
