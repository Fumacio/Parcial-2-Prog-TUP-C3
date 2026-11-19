// /perfil — Cada usuario ve sus datos y cambia su contraseña (RF-U5).
import { Encabezado } from "@/components/comunes/encabezado";
import { Dato, Grilla, Pila } from "@/components/comunes/maquetacion";
import { CambiarPassword } from "@/components/usuarios/cambiar-password";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exigirUsuario } from "@/lib/sesion";

export default async function PaginaPerfil() {
  const usuario = await exigirUsuario();
  return (
    <Pila className="max-w-2xl">
      <Encabezado titulo="Mi perfil" />
      <Card>
        <CardContent>
          <Grilla columnas={3}>
            <Dato etiqueta="Nombre">{usuario.nombre}</Dato>
            <Dato etiqueta="Email">{usuario.email}</Dato>
            <Dato etiqueta="Rol">{usuario.rol === "admin" ? "Administrador" : "Vendedor"}</Dato>
          </Grilla>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <CambiarPassword />
        </CardContent>
      </Card>
    </Pila>
  );
}
