// /usuarios — Gestión de usuarios (RF-U4). Solo administrador.
// Aunque el vendedor no ve el link en el menú, si entra escribiendo la URL
// el servicio igual lo rechaza (403): ocultar el botón no alcanza.
import { Plus } from "lucide-react";
import { BotonActivar } from "@/components/comunes/boton-activar";
import { Encabezado } from "@/components/comunes/encabezado";
import { FilaVacia, MensajeError } from "@/components/comunes/estados";
import { Filtros, SelectFiltro } from "@/components/comunes/filtros";
import { fecha } from "@/lib/formato";
import { InsigniaActivo } from "@/components/comunes/insignias";
import { Fila, Pila } from "@/components/comunes/maquetacion";
import { Paginador } from "@/components/comunes/paginador";
import { BotonRestablecer } from "@/components/usuarios/boton-restablecer";
import { DialogoUsuario } from "@/components/usuarios/dialogo-usuario";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/errores";
import { leerFiltros } from "@/lib/paginas";
import { exigirUsuario } from "@/lib/sesion";
import { listarUsuarios } from "@/servicios/usuarios";

export default async function PaginaUsuarios({ searchParams }: PageProps<"/usuarios">) {
  const usuario = await exigirUsuario();
  const filtros = await leerFiltros(searchParams);

  let resultado;
  try {
    resultado = await listarUsuarios(usuario, filtros);
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      return <MensajeError mensaje="Esta sección es solo para administradores." />;
    }
    throw e;
  }

  return (
    <Pila>
      <Encabezado titulo="Usuarios" descripcion="Quiénes pueden entrar al sistema y con qué rol">
        <DialogoUsuario>
          <Button>
            <Plus /> Nuevo usuario
          </Button>
        </DialogoUsuario>
      </Encabezado>
      <Filtros q={filtros.q} placeholder="Nombre o email" limpiar="/usuarios">
        <SelectFiltro
          name="activo"
          defaultValue={filtros.activo}
          todos="Todos"
          opciones={[
            { valor: "true", texto: "Activos" },
            { valor: "false", texto: "Inactivos" },
          ]}
        />
      </Filtros>
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Alta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.data.length === 0 && <FilaVacia columnas={6} />}
              {resultado.data.map((u) => (
                <TableRow key={u.id} className={u.activo ? undefined : "text-muted-foreground"}>
                  <TableCell className="font-medium">
                    {u.nombre} {u.id === usuario.id && <span className="text-xs font-normal text-muted-foreground">(vos)</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.rol === "admin" ? "default" : "secondary"}>
                      {u.rol === "admin" ? "Administrador" : "Vendedor"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <InsigniaActivo activo={u.activo} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{fecha(u.creadoEn)}</TableCell>
                  <TableCell>
                    <Fila className="justify-end">
                      <DialogoUsuario usuario={u}>
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      </DialogoUsuario>
                      <BotonRestablecer usuarioId={u.id} nombre={u.nombre} />
                      {u.id !== usuario.id && (
                        <BotonActivar url={`/api/usuarios/${u.id}`} activo={u.activo} nombre="al usuario" />
                      )}
                    </Fila>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Paginador {...resultado} filtros={filtros} />
    </Pila>
  );
}
