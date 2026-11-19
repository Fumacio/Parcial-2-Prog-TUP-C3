"use client";
// Estructura que comparten todas las pantallas (sección 4):
// panel lateral fijo con los 5 módulos (el activo resaltado) y barra superior con el usuario y "Salir".
// En pantallas chicas el panel lateral se colapsa en un menú (Sheet).
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LogOut, Menu, Package, Plus, ShoppingCart, UserCog, Users, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/cliente-api";
import { COMERCIO } from "@/lib/config";
import type { Usuario } from "@/lib/tipos";
import { cn } from "@/lib/utils";

const MODULOS = [
  { href: "/", texto: "Inicio", icono: Home },
  { href: "/ventas", texto: "Ventas", icono: ShoppingCart },
  { href: "/productos", texto: "Productos", icono: Package },
  { href: "/clientes", texto: "Clientes", icono: Users },
  { href: "/usuarios", texto: "Usuarios", icono: UserCog, soloAdmin: true },
];

function Navegacion({
  usuario,
  bajoMinimo,
  alElegir,
}: {
  usuario: Usuario;
  bajoMinimo: number;
  alElegir?: () => void;
}) {
  const ruta = usePathname();
  const activo = (href: string) =>
    href === "/" ? ruta === "/" : ruta.startsWith(href) && !(href === "/ventas" && ruta === "/ventas/nueva");

  return (
    <nav className="flex flex-col gap-1">
      {/* Acceso directo a la operación más frecuente */}
      <Button asChild className="mb-3 w-full justify-start" size="lg">
        <Link href="/ventas/nueva" onClick={alElegir}>
          <Plus /> Nueva venta
        </Link>
      </Button>
      {MODULOS.filter((m) => !m.soloAdmin || usuario.rol === "admin").map((m) => (
        <Link
          key={m.href}
          href={m.href}
          onClick={alElegir}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            activo(m.href)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <m.icono className="size-4" />
          {m.texto}
          {/* Contador de productos bajo el stock mínimo */}
          {m.href === "/productos" && bajoMinimo > 0 && (
            <Badge variant="destructive" className="ml-auto" title="Productos bajo el stock mínimo">
              {bajoMinimo}
            </Badge>
          )}
        </Link>
      ))}
    </nav>
  );
}

function Marca() {
  return (
    <div className="flex items-center gap-2 px-3 py-4">
      <Wrench className="size-5 text-primary" />
      <span className="font-semibold leading-tight">{COMERCIO.nombre}</span>
    </div>
  );
}

export function Estructura({
  usuario,
  bajoMinimo,
  children,
}: {
  usuario: Usuario;
  bajoMinimo: number;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function salir() {
    await api("/api/auth/logout", "POST");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Panel lateral fijo (pantallas medianas y grandes) */}
      <aside className="hidden w-60 shrink-0 border-r bg-background px-3 md:block print:hidden">
        <div className="sticky top-0 flex h-screen flex-col">
          <Marca />
          <Navegacion usuario={usuario} bajoMinimo={bajoMinimo} />
          <p className="mt-auto px-3 py-4 text-xs text-muted-foreground">Comprobantes internos sin validez fiscal</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior */}
        <header className="flex h-14 items-center gap-2 border-b bg-background px-4 print:hidden">
          {/* Menú para celulares */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 px-3">
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <Marca />
              <Navegacion usuario={usuario} bajoMinimo={bajoMinimo} />
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex items-center gap-3">
            <Link href="/perfil" className="text-sm font-medium hover:underline">
              {usuario.nombre}
            </Link>
            <Badge variant="outline">{usuario.rol === "admin" ? "Administrador" : "Vendedor"}</Badge>
            <Button variant="ghost" size="sm" onClick={salir}>
              <LogOut /> Salir
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
