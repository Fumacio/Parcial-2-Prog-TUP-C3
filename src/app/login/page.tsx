// /login: única página pública (RF-U2). Queda FUERA del layout con panel lateral
// porque no está dentro de la carpeta (sistema).
import { redirect } from "next/navigation";
import { FormularioLogin } from "@/components/auth/formulario-login";
import { usuarioActual } from "@/lib/sesion";

export default async function PaginaLogin() {
  // Si ya tiene una sesión válida, no tiene sentido mostrar el login
  if (await usuarioActual()) redirect("/");
  return (
    <>
      <FormularioLogin />
      {/* Integrantes del grupo, fijos en la esquina inferior derecha */}
      <aside className="fixed right-4 bottom-4 rounded-lg border bg-card px-4 py-3 text-sm text-card-foreground shadow-md">
        <p className="mb-1 font-semibold">Grupo 22</p>
        <ul className="space-y-0.5 text-muted-foreground">
          <li>Flores Ignacio</li>
          <li>Andrada Lourdes</li>
          <li>Valentín Patti</li>
        </ul>
      </aside>
    </>
  );
}
