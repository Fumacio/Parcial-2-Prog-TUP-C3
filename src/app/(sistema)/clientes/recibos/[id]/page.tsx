// /clientes/recibos/[id] — Recibo de pago numerado e imprimible (RF-C5).
import Link from "next/link";
import { BotonImprimir } from "@/components/comunes/boton-imprimir";
import { Encabezado } from "@/components/comunes/encabezado";
import { Dato, Grilla, Pila, Texto, Titulo } from "@/components/comunes/maquetacion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { COMERCIO } from "@/lib/config";
import { documento, fechaHora, moneda, nombresMedioPago } from "@/lib/formato";
import { idDePagina, oNoEncontrado } from "@/lib/paginas";
import { exigirUsuario } from "@/lib/sesion";
import { obtenerPago } from "@/servicios/pagos";

export default async function PaginaRecibo({ params }: PageProps<"/clientes/recibos/[id]">) {
  const usuario = await exigirUsuario();
  const recibo = await oNoEncontrado(obtenerPago(usuario, idDePagina((await params).id)));

  return (
    <Pila className="mx-auto max-w-2xl">
      <Encabezado titulo="Recibo de pago">
        <Button variant="outline" asChild>
          <Link href={`/clientes/${recibo.cliente.id}`}>Volver al cliente</Link>
        </Button>
        <BotonImprimir />
      </Encabezado>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader>
          <Grilla columnas={2}>
            <Pila className="gap-1">
              <Titulo>{COMERCIO.nombre}</Titulo>
              <Texto suave>{COMERCIO.domicilio}</Texto>
              <Texto suave>CUIT {COMERCIO.cuit}</Texto>
            </Pila>
            <Pila className="gap-1 sm:items-end">
              <Titulo>{recibo.numeroRecibo}</Titulo>
              <Texto suave>{fechaHora(recibo.fecha)}</Texto>
            </Pila>
          </Grilla>
        </CardHeader>
        <CardContent>
          <Pila>
            <Separator />
            <Grilla columnas={2}>
              <Dato etiqueta="Recibimos de">{recibo.cliente.nombre}</Dato>
              <Dato etiqueta="Documento">{documento(recibo.cliente.tipoDoc, recibo.cliente.nroDoc)}</Dato>
              <Dato etiqueta="Medio de pago">{nombresMedioPago[recibo.medio]}</Dato>
              <Dato etiqueta="Atendió">{recibo.usuario.nombre}</Dato>
              {recibo.observacion && <Dato etiqueta="Observación">{recibo.observacion}</Dato>}
            </Grilla>
            <Separator />
            <Grilla columnas={2}>
              <Dato etiqueta="Importe recibido">
                <Titulo className="text-2xl">{moneda(recibo.importe)}</Titulo>
              </Dato>
              <Dato etiqueta="Saldo actual de la cuenta">{moneda(recibo.saldoCliente)}</Dato>
            </Grilla>
          </Pila>
        </CardContent>
      </Card>
    </Pila>
  );
}
