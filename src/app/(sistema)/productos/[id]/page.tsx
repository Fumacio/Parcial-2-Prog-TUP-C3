// /productos/[id] — Ficha del producto con sus movimientos (RF-P6).
// El administrador puede editar, registrar ingresos/egresos y dar de baja.
import { ArrowDownToLine, ArrowUpFromLine, Pencil } from "lucide-react";
import { BotonActivar } from "@/components/comunes/boton-activar";
import { Encabezado } from "@/components/comunes/encabezado";
import { InsigniaActivo, InsigniaBajoMinimo } from "@/components/comunes/insignias";
import { Dato, Fila, Grilla, Pila } from "@/components/comunes/maquetacion";
import { Paginador } from "@/components/comunes/paginador";
import { DialogoMovimiento } from "@/components/productos/dialogo-movimiento";
import { DialogoProducto } from "@/components/productos/dialogo-producto";
import { TablaMovimientos } from "@/components/productos/tabla-movimientos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { moneda } from "@/lib/formato";
import { idDePagina, leerFiltros, oNoEncontrado } from "@/lib/paginas";
import { exigirUsuario } from "@/lib/sesion";
import { listarCategorias } from "@/servicios/categorias";
import { obtenerProducto } from "@/servicios/productos";
import { listarMovimientos } from "@/servicios/stock";

export default async function FichaProducto({ params, searchParams }: PageProps<"/productos/[id]">) {
  const usuario = await exigirUsuario();
  const id = idDePagina((await params).id);
  const filtros = await leerFiltros(searchParams);
  const esAdmin = usuario.rol === "admin";

  const producto = await oNoEncontrado(obtenerProducto(usuario, id));
  const [movimientos, categorias] = await Promise.all([
    listarMovimientos(usuario, { ...filtros, productoId: String(id) }),
    listarCategorias(usuario),
  ]);

  return (
    <Pila>
      <Encabezado titulo={producto.descripcion} descripcion={`Código ${producto.codigo}`}>
        {esAdmin && (
          <>
            <DialogoMovimiento productoId={id} existencia={producto.existencia} tipo="ingreso">
              <Button variant="outline">
                <ArrowDownToLine /> Ingreso
              </Button>
            </DialogoMovimiento>
            <DialogoMovimiento productoId={id} existencia={producto.existencia} tipo="egreso">
              <Button variant="outline">
                <ArrowUpFromLine /> Egreso
              </Button>
            </DialogoMovimiento>
            <DialogoProducto producto={producto} categorias={categorias}>
              <Button variant="outline">
                <Pencil /> Editar
              </Button>
            </DialogoProducto>
            <BotonActivar url={`/api/productos/${id}`} activo={producto.activo} nombre="el producto" />
          </>
        )}
      </Encabezado>

      <Card>
        <CardContent>
          <Grilla>
            <Dato etiqueta="Categoría">{producto.categoria.nombre}</Dato>
            <Dato etiqueta="Precio de venta">{moneda(producto.precio)}</Dato>
            <Dato etiqueta="Existencia">
              <Fila>
                {producto.existencia} unidades {producto.bajoMinimo && <InsigniaBajoMinimo />}
              </Fila>
            </Dato>
            <Dato etiqueta="Stock mínimo">{producto.stockMinimo}</Dato>
            <Dato etiqueta="Estado">
              <InsigniaActivo activo={producto.activo} />
            </Dato>
          </Grilla>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos de stock</CardTitle>
        </CardHeader>
        <CardContent>
          <TablaMovimientos movimientos={movimientos.data} />
        </CardContent>
      </Card>
      <Paginador {...movimientos} filtros={filtros} />
    </Pila>
  );
}
