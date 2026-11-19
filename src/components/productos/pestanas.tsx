"use client";
// Pestañas del módulo Productos: Catálogo · Existencias · Categorías (sección 4).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PESTANAS = [
  { href: "/productos", texto: "Catálogo" },
  { href: "/productos/existencias", texto: "Existencias" },
  { href: "/productos/categorias", texto: "Categorías" },
];

export function PestanasProductos() {
  const ruta = usePathname();
  return (
    <div className="flex gap-1 border-b print:hidden">
      {PESTANAS.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
            ruta === p.href ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {p.texto}
        </Link>
      ))}
    </div>
  );
}
