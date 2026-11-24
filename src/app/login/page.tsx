// /login: única página pública (RF-U2). Queda FUERA del layout con panel lateral
// porque no está dentro de la carpeta (sistema).
import { redirect } from "next/navigation";
import { FormularioLogin } from "@/components/auth/formulario-login";
import { Users } from "lucide-react";
import { usuarioActual } from "@/lib/sesion";

const INTEGRANTES = ["Flores Ignacio", "Andrada Lourdes", "Valentín Patti"];

/** "Flores Ignacio" -> "FI" */
function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
}

export default async function PaginaLogin() {
  // Si ya tiene una sesión válida, no tiene sentido mostrar el login
  if (await usuarioActual()) redirect("/");
  return (
    <>
      <FormularioLogin />
      {/* Integrantes del grupo, fijos en la esquina inferior derecha */}
      <aside className="fixed right-4 bottom-4 w-56 overflow-hidden rounded-xl border bg-card/95 text-card-foreground shadow-lg backdrop-blur">
        <div className="flex items-center justify-between gap-2 bg-primary px-4 py-2 text-primary-foreground">
          <div className="flex items-center gap-2">
            <Users className="size-4" />
            <span className="text-xs font-semibold tracking-wide uppercase">Integrantes</span>
          </div>
          <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-bold">
            Grupo 22
          </span>
        </div>
        <ul className="space-y-2 px-4 py-3">
          {INTEGRANTES.map((nombre) => (
            <li key={nombre} className="flex items-center gap-3 text-sm">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {iniciales(nombre)}
              </span>
              <span className="font-medium">{nombre}</span>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
