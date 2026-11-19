// Paginador: arma los links "anterior / siguiente" conservando los filtros de la URL.
// Como la búsqueda y la página viven en la URL, un listado se puede recargar y compartir.
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Paginador({
  page,
  pageSize,
  total,
  filtros,
}: {
  page: number;
  pageSize: number;
  total: number;
  filtros: Record<string, string | undefined>;
}) {
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  const enlace = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) if (v) params.set(k, v);
    params.set("page", String(p));
    return `?${params}`;
  };

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground print:hidden">
      <span>
        {total} {total === 1 ? "registro" : "registros"} · página {page} de {paginas}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          {page <= 1 ? <span>Anterior</span> : <Link href={enlace(page - 1)}>Anterior</Link>}
        </Button>
        <Button variant="outline" size="sm" asChild disabled={page >= paginas}>
          {page >= paginas ? <span>Siguiente</span> : <Link href={enlace(page + 1)}>Siguiente</Link>}
        </Button>
      </div>
    </div>
  );
}
