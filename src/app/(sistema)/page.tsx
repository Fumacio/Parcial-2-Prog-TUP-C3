// "/" Tablero de inicio (RF-T1, RF-T2, RF-T3).
// Es un Server Component: llama directamente al servicio (no hace falta pasar por la API).
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Encabezado } from "@/components/comunes/encabezado";
import { FilaVacia, Vacio } from "@/components/comunes/estados";
import { Grilla, Pila, Texto } from "@/components/comunes/maquetacion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listarProductos } from "@/servicios/productos";
import { GraficoFormasPago, GraficoVentasDiarias } from "@/components/tablero/graficos";
import { Indicador } from "@/components/tablero/indicador";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaLarga, moneda } from "@/lib/formato";
import { exigirUsuario } from "@/lib/sesion";
import { resumenTablero } from "@/servicios/tablero";

export default async function PaginaInicio() {
  const usuario = await exigirUsuario();
  const [t, reponer] = await Promise.all([
    resumenTablero(usuario),
    // La lista para reponer sale del catálogo filtrado (sección 11.7)
    listarProductos(usuario, { bajoMinimo: "true", pageSize: "5" }),
  ]);

  return (
    <Pila>
      <Encabezado titulo={`Hola, ${usuario.nombre.split(" ")[0]}`} descripcion={fechaLarga(new Date())}>
        <Button asChild>
          <Link href="/ventas/nueva">
            <Plus /> Nueva venta
          </Link>
        </Button>
      </Encabezado>

      {/* RF-T1: indicadores */}
      <Grilla>
        <Indicador titulo="Ventas de hoy" valor={moneda(t.hoy.importe)} detalle={`${t.hoy.cantidad} facturas`} />
        <Indicador
          titulo="Ventas del mes"
          valor={moneda(t.mes.importe)}
          detalle={`${t.mes.cantidad} facturas · ticket promedio ${moneda(t.mes.ticketPromedio)}`}
        />
        <Indicador
          titulo="Deuda en cuentas corrientes"
          valor={moneda(t.cuentasCorrientes.totalAdeudado)}
          detalle={`${t.cuentasCorrientes.clientesConSaldo} clientes con saldo`}
          href="/clientes/saldos"
        />
        <Indicador
          titulo="Productos bajo el mínimo"
          valor={String(t.bajoMinimo.cantidad)}
          detalle="para reponer"
          href="/productos?bajoMinimo=true"
          alerta={t.bajoMinimo.cantidad > 0}
        />
      </Grilla>

      {/* RF-T2: gráficos */}
      <Grilla columnas={3}>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas de los últimos 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoVentasDiarias datos={t.ventasDiarias} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ventas del mes por forma de pago</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoFormasPago datos={t.porFormaDePago} />
          </CardContent>
        </Card>
      </Grilla>

      <Grilla columnas={3}>
      {/* RF-T3: más vendidos */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Los 5 más vendidos del mes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.masVendidos.length === 0 && <FilaVacia columnas={4} mensaje="Todavía no hay ventas este mes." />}
              {t.masVendidos.map((p) => (
                <TableRow key={p.productoId}>
                  <TableCell className="font-mono text-xs">{p.codigo}</TableCell>
                  <TableCell>
                    <Link href={`/productos/${p.productoId}`} className="hover:underline">
                      {p.descripcion}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{p.unidades}</TableCell>
                  <TableCell className="text-right">{moneda(p.importe)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Productos bajo el stock mínimo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Para reponer</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/productos?bajoMinimo=true">
              Ver todos <ArrowRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {reponer.data.length === 0 && <Vacio mensaje="Ningún producto bajo el mínimo." />}
          <Pila className="gap-0 divide-y">
            {reponer.data.map((p) => (
              <Link key={p.id} href={`/productos/${p.id}`} className="flex items-center justify-between py-2 hover:bg-muted/50">
                <Pila className="gap-0">
                  <Texto>{p.descripcion}</Texto>
                  <Texto suave className="font-mono text-xs">{p.codigo}</Texto>
                </Pila>
                <Pila className="items-end gap-0">
                  <Badge variant="destructive">{p.existencia} · bajo mínimo</Badge>
                  <Texto suave className="text-xs">mínimo {p.stockMinimo}</Texto>
                </Pila>
              </Link>
            ))}
          </Pila>
        </CardContent>
      </Card>
      </Grilla>
    </Pila>
  );
}
