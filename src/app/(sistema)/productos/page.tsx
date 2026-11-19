// /productos — Catálogo (RF-P1). Búsqueda, filtro por categoría y marca de "bajo mínimo".
// Los filtros viven en la URL (?q=...&categoriaId=...&page=2).
import Link from "next/link";
import { Plus } from "lucide-react";
import { Encabezado } from "@/components/comunes/encabezado";
import { FilaVacia } from "@/components/comunes/estados";
import { Filtros, SelectFiltro } from "@/components/comunes/filtros";
import { InsigniaActivo, InsigniaBajoMinimo } from "@/components/comunes/insignias";
import { Pila } from "@/components/comunes/maquetacion";
import { Paginador } from "@/components/comunes/paginador";
import { DialogoProducto } from "@/components/productos/dialogo-producto";
import { PestanasProductos } from "@/components/productos/pestanas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { moneda } from "@/lib/formato";
import { leerFiltros } from "@/lib/paginas";
import { exigirUsuario } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/categorias";
import { listarProductos } from "@/servicios/productos";

export default async function PaginaProductos({ searchParams }: PageProps<"/productos">) {
  const usuario = await exigirUsuario();
  const filtros = await leerFiltros(searchParams);
  const esAdmin = usuario.rol === "admin";
  const [resultado, categorias] = await Promise.all([listarProductos(usuario, filtros), listarCategorias(usuario)]);

  return (
    <Pila>
      <Encabezado titulo="Productos" descripcion={`${resultado.total} productos en el catálogo`}>
        {esAdmin && (
          <DialogoProducto categorias={categorias}>
            <Button>
              <Plus /> Nuevo producto
            </Button>
          </DialogoProducto>
        )}
      </Encabezado>
      <PestanasProductos />

      <Filtros q={filtros.q} placeholder="Código o descripción" limpiar="/productos">
        <SelectFiltro
          name="categoriaId"
          defaultValue={filtros.categoriaId}
          todos="Todas las categorías"
          opciones={categorias.map((c) => ({ valor: String(c.id), texto: c.nombre }))}
        />
        <SelectFiltro
          name="bajoMinimo"
          defaultValue={filtros.bajoMinimo}
          todos="Toda la existencia"
          opciones={[{ valor: "true", texto: "Solo bajo mínimo" }]}
        />
        {esAdmin && (
          <SelectFiltro
            name="activo"
            defaultValue={filtros.activo}
            todos="Activos"
            opciones={[
              { valor: "false", texto: "Dados de baja" },
              { valor: "todos", texto: "Activos y bajas" },
            ]}
          />
        )}
      </Filtros>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Existencia</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Mínimo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.data.length === 0 && <FilaVacia columnas={6} mensaje="No hay productos con esos filtros." />}
              {resultado.data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                  <TableCell>
                    <Link href={`/productos/${p.id}`} className="font-medium hover:underline">
                      {p.descripcion}
                    </Link>{" "}
                    {!p.activo && <InsigniaActivo activo={false} />}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{p.categoria.nombre}</TableCell>
                  <TableCell className="text-right">{moneda(p.precio)}</TableCell>
                  <TableCell className="text-right">
                    {p.bajoMinimo ? <InsigniaBajoMinimo cantidad={p.existencia} /> : p.existencia}
                  </TableCell>
                  <TableCell className="hidden text-right text-muted-foreground sm:table-cell">{p.stockMinimo}</TableCell>
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
