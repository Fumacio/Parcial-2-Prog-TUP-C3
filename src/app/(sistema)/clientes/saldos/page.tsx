// /clientes/saldos — Clientes con deuda, de mayor a menor, con el total adeudado (RF-C6).
import Link from "next/link";
import { PestanasClientes } from "@/components/clientes/pestanas";
import { Encabezado } from "@/components/comunes/encabezado";
import { FilaVacia } from "@/components/comunes/estados";
import { Pila } from "@/components/comunes/maquetacion";
import { Paginador } from "@/components/comunes/paginador";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { documento, moneda } from "@/lib/formato";
import { leerFiltros } from "@/lib/paginas";
import { exigirUsuario } from "@/lib/sesion";
import { listarClientes } from "@/servicios/clientes";

export default async function PaginaSaldos({ searchParams }: PageProps<"/clientes/saldos">) {
  const usuario = await exigirUsuario();
  const filtros = await leerFiltros(searchParams);
  const resultado = await listarClientes(usuario, { ...filtros, conDeuda: "true", orden: "saldo" });
  const totalAdeudado = "totalAdeudado" in resultado ? resultado.totalAdeudado : 0;

  return (
    <Pila>
      <Encabezado titulo="Clientes" descripcion="Saldos de cuenta corriente" />
      <PestanasClientes />
      <Card>
        <CardHeader>
          <CardDescription>Total adeudado</CardDescription>
          <CardTitle className="text-2xl">{moneda(totalAdeudado)}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead className="text-right">Límite</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.data.length === 0 && <FilaVacia columnas={4} mensaje="Ningún cliente tiene deuda." />}
              {resultado.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                      {c.nombre}
                    </Link>
                  </TableCell>
                  <TableCell>{documento(c.tipoDoc, c.nroDoc)}</TableCell>
                  <TableCell className="text-right">{c.limiteCredito == null ? "Sin límite" : moneda(c.limiteCredito)}</TableCell>
                  <TableCell className="text-right font-medium text-red-700">{moneda(c.saldo)}</TableCell>
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
