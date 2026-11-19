// /productos/categorias — Categorías (RF-P7). El vendedor solo las ve; el admin las edita.
import { BotonActivar } from "@/components/comunes/boton-activar";
import { Encabezado } from "@/components/comunes/encabezado";
import { FilaVacia } from "@/components/comunes/estados";
import { InsigniaActivo } from "@/components/comunes/insignias";
import { Fila, Pila } from "@/components/comunes/maquetacion";
import { DialogoCategoria } from "@/components/productos/categorias";
import { PestanasProductos } from "@/components/productos/pestanas";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exigirUsuario } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/categorias";

export default async function PaginaCategorias() {
  const usuario = await exigirUsuario();
  const esAdmin = usuario.rol === "admin";
  const categorias = await listarCategorias(usuario, { todas: "true" });

  return (
    <Pila>
      <Encabezado titulo="Productos" descripcion="Categorías del catálogo">
        {esAdmin && <DialogoCategoria />}
      </Encabezado>
      <PestanasProductos />
      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.length === 0 && <FilaVacia columnas={3} />}
              {categorias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell>
                    <InsigniaActivo activo={c.activa} />
                  </TableCell>
                  {esAdmin && (
                    <TableCell>
                      <Fila className="justify-end">
                        <DialogoCategoria categoria={c} />
                        <BotonActivar url={`/api/categorias/${c.id}`} activo={c.activa} nombre="la categoría" campo="activa" />
                      </Fila>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Pila>
  );
}
