// /clientes/[id] — Ficha del cliente (RF-C3) con la pestaña "Cuenta corriente" (RF-C4).
import Link from "next/link";
import { ArrowLeft, ArrowRight, HandCoins, Pencil } from "lucide-react";
import { FechaFiltro, Filtros } from "@/components/comunes/filtros";
import { DialogoCliente } from "@/components/clientes/dialogo-cliente";
import { DialogoPago } from "@/components/clientes/dialogo-pago";
import { BotonActivar } from "@/components/comunes/boton-activar";
import { Encabezado } from "@/components/comunes/encabezado";
import { FilaVacia } from "@/components/comunes/estados";
import { InsigniaActivo, InsigniaEstado, InsigniaFormaPago } from "@/components/comunes/insignias";
import { Dato, Grilla, Pila } from "@/components/comunes/maquetacion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { documento, fecha, fechaHora, moneda } from "@/lib/formato";
import { idDePagina, leerFiltros, oNoEncontrado } from "@/lib/paginas";
import { exigirUsuario } from "@/lib/sesion";
import { cuentaCorriente, obtenerCliente } from "@/servicios/clientes";

export default async function FichaCliente({ params, searchParams }: PageProps<"/clientes/[id]">) {
  const usuario = await exigirUsuario();
  const id = idDePagina((await params).id);
  const filtros = await leerFiltros(searchParams);
  const cliente = await oNoEncontrado(obtenerCliente(usuario, id));
  // desde/hasta filtran la cuenta corriente (RF-C4); "tab" recuerda la pestaña abierta
  const cuenta = await cuentaCorriente(usuario, id, { desde: filtros.desde, hasta: filtros.hasta });

  return (
    <Pila>
      <Button variant="link" asChild className="self-start px-0 print:hidden">
        <Link href="/clientes">
          <ArrowLeft /> Clientes
        </Link>
      </Button>
      <Encabezado titulo={cliente.nombre} descripcion={documento(cliente.tipoDoc, cliente.nroDoc)}>
        {cliente.cuentaCorriente && cliente.saldo > 0 && (
          <DialogoPago clienteId={id} saldo={cliente.saldo}>
            <Button>
              <HandCoins /> Registrar pago
            </Button>
          </DialogoPago>
        )}
        <DialogoCliente cliente={cliente}>
          <Button variant="outline">
            <Pencil /> Editar
          </Button>
        </DialogoCliente>
        <BotonActivar url={`/api/clientes/${id}`} activo={cliente.activo} nombre="el cliente" />
      </Encabezado>

      <Grilla>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Saldo actual</CardTitle>
            <CardTitle className={cliente.saldo > 0 ? "text-2xl text-red-700" : "text-2xl"}>{moneda(cliente.saldo)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Límite de crédito</CardTitle>
            <CardTitle className="text-2xl">
              {cliente.limiteCredito == null ? "Sin límite" : moneda(cliente.limiteCredito)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Disponible</CardTitle>
            <CardTitle className="text-2xl">{cliente.disponible == null ? "—" : moneda(cliente.disponible)}</CardTitle>
          </CardHeader>
        </Card>
      </Grilla>

      <Tabs defaultValue={filtros.tab === "cuenta" ? "cuenta" : "datos"}>
        <TabsList>
          <TabsTrigger value="datos">Datos y facturas</TabsTrigger>
          <TabsTrigger value="cuenta">Cuenta corriente</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <Pila>
            <Card>
              <CardContent>
                <Grilla>
                  <Dato etiqueta="Domicilio">{cliente.domicilio}</Dato>
                  <Dato etiqueta="Teléfono">{cliente.telefono}</Dato>
                  <Dato etiqueta="Email">{cliente.email}</Dato>
                  <Dato etiqueta="Cuenta corriente">{cliente.cuentaCorriente ? "Habilitada" : "No habilitada"}</Dato>
                  <Dato etiqueta="Estado">
                    <InsigniaActivo activo={cliente.activo} />
                  </Dato>
                </Grilla>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Últimas facturas</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/ventas?clienteId=${id}`}>
                    Ver todas <ArrowRight />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Forma de pago</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cliente.ultimasFacturas.length === 0 && <FilaVacia columnas={5} mensaje="Sin facturas." />}
                    {cliente.ultimasFacturas.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <Link href={`/ventas/${f.id}`} className="font-mono text-xs hover:underline">
                            {f.numeroFormateado}
                          </Link>
                        </TableCell>
                        <TableCell>{fecha(f.fecha)}</TableCell>
                        <TableCell>
                          <InsigniaFormaPago forma={f.formaPago} />
                        </TableCell>
                        <TableCell>
                          <InsigniaEstado estado={f.estado} />
                        </TableCell>
                        <TableCell className="text-right">{moneda(f.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Pila>
        </TabsContent>

        <TabsContent value="cuenta">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos de la cuenta corriente</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Filtros limpiar={`/clientes/${id}?tab=cuenta`} busqueda={false}>
                <input type="hidden" name="tab" value="cuenta" />
                <FechaFiltro name="desde" etiqueta="Desde" defaultValue={filtros.desde} />
                <FechaFiltro name="hasta" etiqueta="Hasta" defaultValue={filtros.hasta} />
              </Filtros>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Si "desde" corta el historial, se muestra lo acumulado antes de esa fecha */}
                  {filtros.desde && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground">
                        Saldo anterior al {fecha(`${filtros.desde}T12:00:00-03:00`)}
                      </TableCell>
                      <TableCell className="text-right font-medium">{moneda(cuenta.saldoAnterior)}</TableCell>
                    </TableRow>
                  )}
                  {cuenta.movimientos.length === 0 && <FilaVacia columnas={5} mensaje="Sin movimientos." />}
                  {cuenta.movimientos.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap">{fechaHora(m.fecha)}</TableCell>
                      <TableCell>
                        {m.pagoId ? (
                          <Link href={`/clientes/recibos/${m.pagoId}`} className="hover:underline">
                            {m.descripcion}
                          </Link>
                        ) : m.facturaId ? (
                          <Link href={`/ventas/${m.facturaId}`} className="hover:underline">
                            {m.descripcion}
                          </Link>
                        ) : (
                          m.descripcion
                        )}
                      </TableCell>
                      <TableCell className="text-right">{m.tipo === "debito" ? moneda(m.importe) : ""}</TableCell>
                      <TableCell className="text-right">{m.tipo === "credito" ? moneda(m.importe) : ""}</TableCell>
                      <TableCell className="text-right font-medium">{moneda(m.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="text-right text-muted-foreground">
                      Saldo al cierre
                    </TableCell>
                    <TableCell className="text-right font-bold">{moneda(cuenta.saldo)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Pila>
  );
}
