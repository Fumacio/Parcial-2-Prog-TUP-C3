// Tabla de movimientos de stock (RF-P6): fecha, tipo, cantidad, existencia resultante,
// usuario y referencia a la factura cuando la hay. La usan la ficha del producto y "Existencias".
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FilaVacia } from "@/components/comunes/estados";
import { fechaHora } from "@/lib/formato";
import type { listarMovimientos } from "@/servicios/stock";

type Movimiento = Awaited<ReturnType<typeof listarMovimientos>>["data"][number];

const TIPOS: Record<string, string> = { venta: "Venta", anulacion: "Anulación", ingreso: "Ingreso", egreso: "Egreso" };

export function TablaMovimientos({ movimientos, conProducto }: { movimientos: Movimiento[]; conProducto?: boolean }) {
  const columnas = conProducto ? 8 : 7;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          {conProducto && <TableHead>Producto</TableHead>}
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Cantidad</TableHead>
          <TableHead className="text-right">Existencia</TableHead>
          <TableHead className="hidden md:table-cell">Motivo</TableHead>
          <TableHead className="hidden md:table-cell">Usuario</TableHead>
          <TableHead>Referencia</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movimientos.length === 0 && <FilaVacia columnas={columnas} mensaje="Sin movimientos." />}
        {movimientos.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="whitespace-nowrap">{fechaHora(m.fecha)}</TableCell>
            {conProducto && (
              <TableCell>
                <Link href={`/productos/${m.producto.id}`} className="hover:underline">
                  <span className="font-mono text-xs">{m.producto.codigo}</span> {m.producto.descripcion}
                </Link>
              </TableCell>
            )}
            <TableCell>
              <Badge variant={m.cantidad > 0 ? "secondary" : "outline"}>{TIPOS[m.tipo]}</Badge>
            </TableCell>
            <TableCell className={m.cantidad > 0 ? "text-right text-green-700" : "text-right text-red-700"}>
              {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
            </TableCell>
            <TableCell className="text-right font-medium">{m.existenciaResultante}</TableCell>
            <TableCell className="hidden md:table-cell">
              {m.motivo}
              {m.observacion && <span className="text-muted-foreground"> · {m.observacion}</span>}
            </TableCell>
            <TableCell className="hidden md:table-cell">{m.usuario.nombre}</TableCell>
            <TableCell>
              {m.referencia ? (
                <Link href={`/ventas/${m.referencia.facturaId}`} className="font-mono text-xs hover:underline">
                  {m.referencia.numero}
                </Link>
              ) : (
                "—"
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
