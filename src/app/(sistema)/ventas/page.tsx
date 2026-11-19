// /ventas — Listado de facturas (RF-V8): filtros por fechas, forma de pago, vendedor y estado;
// búsqueda por número o cliente; paginado.
import Link from "next/link";
import { Plus } from "lucide-react";
import { Encabezado } from "@/components/comunes/encabezado";
import { FilaVacia } from "@/components/comunes/estados";
import { FechaFiltro, Filtros, SelectFiltro } from "@/components/comunes/filtros";
import { InsigniaEstado, InsigniaFormaPago } from "@/components/comunes/insignias";
import { Pila, Texto } from "@/components/comunes/maquetacion";
import { Paginador } from "@/components/comunes/paginador";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaHora, moneda } from "@/lib/formato";
import { leerFiltros } from "@/lib/paginas";
import { exigirUsuario } from "@/lib/sesion";
import { listarFacturas } from "@/servicios/facturas";
import { listarVendedores } from "@/servicios/usuarios";
import { listarClientes } from "@/servicios/clientes";

export default async function PaginaVentas({ searchParams }: PageProps<"/ventas">) {
  const usuario = await exigirUsuario();
  const filtros = await leerFiltros(searchParams);
  const [resultado, vendedores, clientes] = await Promise.all([
    listarFacturas(usuario, filtros),
    listarVendedores(usuario),
    listarClientes(usuario, { activo: "todos", pageSize: "100" }), // para el filtro por cliente
  ]);

  return (
    <Pila>
      <Encabezado
        titulo="Facturas"
        descripcion={`${resultado.total} comprobantes · ${moneda(resultado.totalEmitido)} emitidos con estos filtros`}
      >
        <Button asChild>
          <Link href="/ventas/nueva">
            <Plus /> Nueva venta
          </Link>
        </Button>
      </Encabezado>

      <Filtros q={filtros.q} placeholder="Número o cliente" limpiar="/ventas">
        <FechaFiltro name="desde" etiqueta="Desde" defaultValue={filtros.desde} />
        <FechaFiltro name="hasta" etiqueta="Hasta" defaultValue={filtros.hasta} />
        <SelectFiltro
          name="clienteId"
          defaultValue={filtros.clienteId}
          todos="Todos los clientes"
          opciones={clientes.data.map((c) => ({ valor: String(c.id), texto: c.nombre }))}
        />
        <SelectFiltro
          name="forma"
          defaultValue={filtros.forma}
          todos="Toda forma de pago"
          opciones={[
            { valor: "contado", texto: "Contado" },
            { valor: "tarjeta", texto: "Tarjeta" },
            { valor: "cuenta_corriente", texto: "Cuenta corriente" },
          ]}
        />
        <SelectFiltro
          name="vendedorId"
          defaultValue={filtros.vendedorId}
          todos="Todos los vendedores"
          opciones={vendedores.map((v) => ({ valor: String(v.id), texto: v.nombre }))}
        />
        <SelectFiltro
          name="estado"
          defaultValue={filtros.estado}
          todos="Todos los estados"
          opciones={[
            { valor: "emitida", texto: "Emitidas" },
            { valor: "anulada", texto: "Anuladas" },
          ]}
        />
      </Filtros>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Vendedor</TableHead>
                <TableHead className="hidden sm:table-cell">Forma de pago</TableHead>
                <TableHead className="hidden sm:table-cell">Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.data.length === 0 && <FilaVacia columnas={7} mensaje="No hay facturas con esos filtros." />}
              {resultado.data.map((f) => (
                <TableRow key={f.id} className={f.estado === "anulada" ? "text-muted-foreground" : undefined}>
                  <TableCell>
                    <Link href={`/ventas/${f.id}`} className="font-mono text-xs font-medium hover:underline">
                      {f.numeroFormateado}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fechaHora(f.fecha)}</TableCell>
                  <TableCell>{f.cliente?.nombre ?? "Consumidor final"}</TableCell>
                  <TableCell className="hidden md:table-cell">{f.vendedor.nombre}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <InsigniaFormaPago forma={f.formaPago} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <InsigniaEstado estado={f.estado} />
                  </TableCell>
                  <TableCell className="text-right">{moneda(f.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Texto className="text-right font-medium">Total emitido con estos filtros: {moneda(resultado.totalEmitido)}</Texto>
      <Paginador {...resultado} filtros={filtros} />
    </Pila>
  );
}
