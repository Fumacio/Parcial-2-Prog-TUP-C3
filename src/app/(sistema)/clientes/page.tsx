// /clientes — Listado con saldo (RF-C1). Búsqueda por nombre o documento.
import Link from "next/link";
import { Plus } from "lucide-react";
import { DialogoCliente } from "@/components/clientes/dialogo-cliente";
import { PestanasClientes } from "@/components/clientes/pestanas";
import { Encabezado } from "@/components/comunes/encabezado";
import { FilaVacia } from "@/components/comunes/estados";
import { Filtros, SelectFiltro } from "@/components/comunes/filtros";
import { InsigniaActivo } from "@/components/comunes/insignias";
import { Pila } from "@/components/comunes/maquetacion";
import { Paginador } from "@/components/comunes/paginador";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { documento, moneda } from "@/lib/formato";
import { leerFiltros } from "@/lib/paginas";
import { exigirUsuario } from "@/lib/sesion";
import { listarClientes } from "@/servicios/clientes";

export default async function PaginaClientes({ searchParams }: PageProps<"/clientes">) {
  const usuario = await exigirUsuario();
  const filtros = await leerFiltros(searchParams);
  const [resultado, deudores] = await Promise.all([
    listarClientes(usuario, filtros),
    listarClientes(usuario, { conDeuda: "true", pageSize: "1" }), // solo para el total adeudado
  ]);
  const totalAdeudado = "totalAdeudado" in deudores ? deudores.totalAdeudado : 0;

  return (
    <Pila>
      <Encabezado titulo="Clientes" descripcion={`${moneda(totalAdeudado)} adeudados en cuentas corrientes`}>
        <DialogoCliente>
          <Button>
            <Plus /> Nuevo cliente
          </Button>
        </DialogoCliente>
      </Encabezado>
      <PestanasClientes />

      <Filtros q={filtros.q} placeholder="Nombre o documento" limpiar="/clientes">
        <SelectFiltro
          name="activo"
          defaultValue={filtros.activo}
          todos="Activos"
          opciones={[
            { valor: "false", texto: "Dados de baja" },
            { valor: "todos", texto: "Activos y bajas" },
          ]}
        />
        <SelectFiltro
          name="conDeuda"
          defaultValue={filtros.conDeuda}
          todos="Con y sin deuda"
          opciones={[{ valor: "true", texto: "Solo con deuda" }]}
        />
      </Filtros>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Nombre o razón social</TableHead>
                <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                <TableHead className="hidden sm:table-cell">Cuenta</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.data.length === 0 && <FilaVacia columnas={5} mensaje="No hay clientes con esos filtros." />}
              {resultado.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap">{documento(c.tipoDoc, c.nroDoc)}</TableCell>
                  <TableCell>
                    <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                      {c.nombre}
                    </Link>{" "}
                    {!c.activo && <InsigniaActivo activo={false} />}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{c.telefono ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {c.cuentaCorriente ? <Badge variant="secondary">Cta. cte.</Badge> : ""}
                  </TableCell>
                  <TableCell className={c.saldo > 0 ? "text-right font-medium text-red-700" : "text-right"}>
                    {moneda(c.saldo)}
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
