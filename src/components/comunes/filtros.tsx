// Barra de filtros de los listados. Es un formulario GET común:
// al apretar "Buscar" el navegador va a la misma página con ?q=...&categoriaId=...
// No necesita JavaScript y los filtros quedan en la URL.
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNativo, type Opcion } from "./select-nativo";

export function Filtros({
  q,
  placeholder = "Buscar…",
  children,
  limpiar,
  busqueda = true,
}: {
  q?: string;
  placeholder?: string;
  children?: React.ReactNode; // filtros extra (selects, fechas)
  limpiar: string; // URL sin filtros
  busqueda?: boolean; // false = sin el cuadro de texto "q"
}) {
  return (
    <form className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center print:hidden">
      {busqueda && <Input name="q" defaultValue={q} placeholder={placeholder} className="sm:max-w-xs" />}
      {children}
      <div className="flex gap-2">
        <Button type="submit" variant="secondary">
          <Search /> Buscar
        </Button>
        <Button variant="ghost" asChild>
          <Link href={limpiar}>Limpiar</Link>
        </Button>
      </div>
    </form>
  );
}

/** Select de filtro: la primera opción ("Todos") deja el filtro vacío. */
export function SelectFiltro({
  name,
  defaultValue,
  opciones,
  todos = "Todos",
}: {
  name: string;
  defaultValue?: string;
  opciones: Opcion[];
  todos?: string;
}) {
  return <SelectNativo name={name} defaultValue={defaultValue ?? ""} opciones={opciones} vacio={todos} />;
}

/** Campo de fecha para filtros desde/hasta (formato AAAA-MM-DD en la URL). */
export function FechaFiltro({ name, defaultValue, etiqueta }: { name: string; defaultValue?: string; etiqueta: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      {etiqueta}
      <Input type="date" name={name} defaultValue={defaultValue} className="w-auto" />
    </label>
  );
}
