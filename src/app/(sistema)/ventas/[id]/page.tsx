// /ventas/[id] — Detalle de factura y comprobante imprimible (RF-V7). Anulación para el admin (RF-V9).
import Link from "next/link";
import { BotonImprimir } from "@/components/comunes/boton-imprimir";
import { Encabezado } from "@/components/comunes/encabezado";
import { InsigniaEstado } from "@/components/comunes/insignias";
import { Dato, Grilla, Pila, Texto, Titulo } from "@/components/comunes/maquetacion";
import { DialogoAnular } from "@/components/ventas/dialogo-anular";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { COMERCIO } from "@/lib/config";
import { documento, fechaHora, moneda } from "@/lib/formato";
import { idDePagina, oNoEncontrado } from "@/lib/paginas";
import { exigirUsuario } from "@/lib/sesion";
import { obtenerFactura, type Factura } from "@/servicios/facturas";

/** Texto de la forma de pago para el comprobante */
function textoPago(pago: Factura["pago"]) {
  if (pago.forma === "tarjeta" && pago.tarjeta) {
    const t = pago.tarjeta;
    return `Tarjeta de ${t.tipo === "debito" ? "débito" : "crédito"} ${t.marca} terminada en ${t.ultimos4}`;
  }
  if (pago.forma === "contado") {
    return `Contado · Recibido ${moneda(pago.montoRecibido)} · Vuelto ${moneda(pago.vuelto)}`;
  }
  return "Cuenta corriente";
}

export default async function DetalleFactura({ params }: PageProps<"/ventas/[id]">) {
  const usuario = await exigirUsuario();
  const f = await oNoEncontrado(obtenerFactura(usuario, idDePagina((await params).id)));

  return (
    <Pila className="mx-auto max-w-3xl">
      <Encabezado titulo={`Factura ${f.numeroFormateado}`}>
        <Button variant="outline" asChild>
          <Link href="/ventas">Volver</Link>
        </Button>
        <BotonImprimir />
        {usuario.rol === "admin" && f.estado === "emitida" && (
          <DialogoAnular facturaId={f.id} numero={f.numeroFormateado} />
        )}
      </Encabezado>

      {f.anulacion && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent>
            <Texto className="text-destructive">
              Anulada el {fechaHora(f.anulacion.fecha)} por {f.anulacion.usuario?.nombre}. Motivo: {f.anulacion.motivo}
            </Texto>
          </CardContent>
        </Card>
      )}

      {/* Comprobante (RF-V7). Es interno: no tiene validez fiscal. */}
      <Card className="print:border-0 print:shadow-none">
        <CardHeader>
          <Grilla columnas={2}>
            <Pila className="gap-1">
              <Titulo>{COMERCIO.nombre}</Titulo>
              <Texto suave>{COMERCIO.domicilio}</Texto>
              <Texto suave>CUIT {COMERCIO.cuit} · Tel. {COMERCIO.telefono}</Texto>
            </Pila>
            <Pila className="gap-1 sm:items-end">
              <Titulo className="font-mono">{f.numeroFormateado}</Titulo>
              <Texto suave>{fechaHora(f.fecha)}</Texto>
              <InsigniaEstado estado={f.estado} />
            </Pila>
          </Grilla>
        </CardHeader>
        <CardContent>
          <Pila>
            <Separator />
            <Grilla columnas={3}>
              <Dato etiqueta="Cliente">{f.cliente?.nombre ?? "Consumidor final"}</Dato>
              <Dato etiqueta="Documento">{f.cliente ? documento(f.cliente.tipoDoc, f.cliente.nroDoc) : "—"}</Dato>
              <Dato etiqueta="Domicilio">{f.cliente?.domicilio}</Dato>
              <Dato etiqueta="Vendedor">{f.vendedor.nombre}</Dato>
            </Grilla>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {f.items.map((i) => (
                  <TableRow key={i.productoId}>
                    <TableCell className="font-mono text-xs">{i.codigo}</TableCell>
                    <TableCell>{i.descripcion}</TableCell>
                    <TableCell className="text-right">{i.cantidad}</TableCell>
                    <TableCell className="text-right">{moneda(i.precioUnitario)}</TableCell>
                    <TableCell className="text-right">{moneda(i.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right text-lg font-bold">{moneda(f.total)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            <Dato etiqueta="Forma de pago">{textoPago(f.pago)}</Dato>
            {"saldoCliente" in f && f.saldoCliente !== undefined && (
              <Dato etiqueta="Saldo actual de la cuenta corriente">{moneda(f.saldoCliente)}</Dato>
            )}
            <Texto suave className="text-xs">
              Comprobante interno sin validez fiscal.
            </Texto>
          </Pila>
        </CardContent>
      </Card>
    </Pila>
  );
}
