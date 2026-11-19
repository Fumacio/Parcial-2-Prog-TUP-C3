// Select nativo del navegador con el mismo estilo que los Input de shadcn.
// Es simple, accesible y se maneja bien con el teclado.
import { cn } from "@/lib/utils";

export type Opcion = { valor: string; texto: string };

export function SelectNativo({
  opciones,
  vacio,
  className,
  ...props
}: React.ComponentProps<"select"> & { opciones: Opcion[]; vacio?: string }) {
  return (
    <select
      className={cn(
        "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto dark:bg-input/30",
        className,
      )}
      {...props}
    >
      {vacio !== undefined && <option value="">{vacio}</option>}
      {opciones.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  );
}
