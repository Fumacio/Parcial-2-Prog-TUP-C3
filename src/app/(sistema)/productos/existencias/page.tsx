// /productos/existencias — pestaña "Existencias": movimientos de stock de todos los productos (RF-P6).
import { Encabezado } from "@/components/comunes/encabezado";
import { FechaFiltro, Filtros, SelectFiltro } from "@/components/comunes/filtros";
import { Pila } from "@/components/comunes/maquetacion";
import { Paginador } from "@/components/comunes/paginador";
import { PestanasProductos } from "@/components/productos/pestanas";
import { TablaMovimientos } from "@/components/productos/tabla-movimientos";
import { Card, CardContent } from "@/components/ui/card";
import { leerFiltros } from "@/lib/paginas";
import { exigirUsuario } from "@/lib/sesion";
import { listarMovimientos } from "@/servicios/stock";

export default async function PaginaExistencias({ searchParams }: PageProps<"/productos/existencias">) {
  const usuario = await exigirUsuario();
  const filtros = await leerFiltros(searchParams);
  const movimientos = await listarMovimientos(usuario, filtros);

  return (
    <Pila>
      <Encabezado titulo="Productos" descripcion="Movimientos de stock de todos los productos" />
      <PestanasProductos />
      <Filtros limpiar="/productos/existencias" busqueda={false}>
        <SelectFiltro
          name="tipo"
          defaultValue={filtros.tipo}
          todos="Todos los tipos"
          opciones={[
            { valor: "venta", texto: "Venta" },
            { valor: "anulacion", texto: "Anulación" },
            { valor: "ingreso", texto: "Ingreso" },
            { valor: "egreso", texto: "Egreso" },
          ]}
        />
        <FechaFiltro name="desde" etiqueta="Desde" defaultValue={filtros.desde} />
        <FechaFiltro name="hasta" etiqueta="Hasta" defaultValue={filtros.hasta} />
      </Filtros>
      <Card>
        <CardContent>
          <TablaMovimientos movimientos={movimientos.data} conProducto />
        </CardContent>
      </Card>
      <Paginador {...movimientos} filtros={filtros} />
    </Pila>
  );
}
