// /login: única página pública (RF-U2). Queda FUERA del layout con panel lateral
// porque no está dentro de la carpeta (sistema).
import { redirect } from "next/navigation";
import { FormularioLogin } from "@/components/auth/formulario-login";
import { usuarioActual } from "@/lib/sesion";

export default async function PaginaLogin() {
  // Si ya tiene una sesión válida, no tiene sentido mostrar el login
  if (await usuarioActual()) redirect("/");
  return <FormularioLogin />;
}
