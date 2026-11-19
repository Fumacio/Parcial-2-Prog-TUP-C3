"use client";
// Pantalla de Nueva venta (RF-V1 a RF-V6). Una sola pantalla con tres partes:
//   1. Comprador (consumidor final por defecto, buscar cliente o darlo de alta)
//   2. Ítems (buscar producto, cantidad, subtotal; Enter agrega)
//   3. Forma de pago (contado, tarjeta o cuenta corriente)
//
// El total que se ve acá es solo para el vendedor: al confirmar se envían SOLO
// productos y cantidades; el servidor vuelve a calcular precios, total y stock.
//
// Teclado: escribir en "Buscar producto" → flechas ↑↓ para elegir → Enter agrega.
//          Ctrl+Enter confirma la venta desde cualquier lugar de la pantalla.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus, X } from "lucide-react";
import { FormularioCliente } from "@/components/clientes/formulario-cliente";
import { Campo } from "@/components/comunes/campo";
import { SelectNativo } from "@/components/comunes/select-nativo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ErrorDeApi } from "@/lib/cliente-api";
import { esquemaFactura } from "@/lib/esquemas";
import { documento, moneda, pesosACentavos } from "@/lib/formato";
import { erroresDeZod } from "@/lib/validar";
import { cn } from "@/lib/utils";
import type { Cliente } from "@/servicios/clientes";
import type { Producto } from "@/servicios/productos";

type Renglon = { producto: Producto; cantidad: number };
type Forma = "contado" | "tarjeta" | "cuenta_corriente";

const MARCAS = ["Visa", "Mastercard", "American Express", "Cabal", "Naranja"];

/** Renglón "etiqueta ........ valor" del panel de pago */
function Renglon({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-2", fuerte && "font-semibold")}>
      <span className={fuerte ? undefined : "text-muted-foreground"}>{etiqueta}</span>
      <span className="text-right">{valor}</span>
    </div>
  );
}

export function NuevaVenta() {
  const router = useRouter();

  // ---------------------------------------------------------------- estado
  const [numero, setNumero] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null); // null = consumidor final
  const [renglones, setRenglones] = useState<Renglon[]>([]);
  const [formaElegida, setForma] = useState<Forma>("contado");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [tarjeta, setTarjeta] = useState({ tipo: "debito", marca: MARCAS[0], ultimos4: "" });
  const [confirmando, setConfirmando] = useState(false);

  // Búsquedas
  const [textoProducto, setTextoProducto] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [seleccionado, setSeleccionado] = useState(0);
  const [cantidad, setCantidad] = useState("1");
  const [textoCliente, setTextoCliente] = useState("");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [altaCliente, setAltaCliente] = useState(false);
  const buscador = useRef<HTMLInputElement>(null);
  const buscadorCliente = useRef<HTMLInputElement>(null);
  const pago = useRef<HTMLButtonElement>(null);

  // ---------------------------------------------------------------- cálculos (solo para mostrar)
  const total = renglones.reduce((suma, r) => suma + r.producto.precio * r.cantidad, 0);
  const recibido = montoRecibido.trim() === "" ? total : pesosACentavos(montoRecibido);
  const vuelto = Number.isNaN(recibido) ? 0 : recibido - total;
  const puedeCuentaCorriente = !!cliente?.cuentaCorriente;
  // Regla 6: si el comprador no tiene cuenta corriente, la forma vuelve a contado
  const forma: Forma = formaElegida === "cuenta_corriente" && !puedeCuentaCorriente ? "contado" : formaElegida;

  // Número informativo (el real se asigna al confirmar)
  useEffect(() => {
    api<{ numeroFormateado: string }>("/api/facturas/proximo-numero").then((r) => setNumero(r.numeroFormateado));
  }, []);

  // Búsqueda de productos mientras se escribe (espera 250 ms para no consultar en cada tecla)
  useEffect(() => {
    if (!textoProducto.trim()) return;
    const t = setTimeout(async () => {
      const r = await api<{ data: Producto[] }>(`/api/productos?pageSize=8&q=${encodeURIComponent(textoProducto)}`);
      setProductos(r.data);
      setSeleccionado(0);
    }, 250);
    return () => clearTimeout(t);
  }, [textoProducto]);

  // Búsqueda de clientes
  useEffect(() => {
    if (!textoCliente.trim()) return;
    const t = setTimeout(async () => {
      const r = await api<{ data: Cliente[] }>(`/api/clientes?pageSize=6&q=${encodeURIComponent(textoCliente)}`);
      setClientes(r.data);
    }, 250);
    return () => clearTimeout(t);
  }, [textoCliente]);

  // Con el buscador vacío no se muestran sugerencias
  const sugerenciasProductos = textoProducto.trim() ? productos : [];
  const sugerenciasClientes = textoCliente.trim() ? clientes : [];

  // Atajos de teclado: F2 producto, F4 cliente, F8 pago, F9 (o Ctrl+Enter) confirmar
  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        buscador.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (buscadorCliente.current) {
          buscadorCliente.current.focus();
        } else {
          // había un cliente elegido: se quita y se espera a que aparezca el buscador
          setCliente(null);
          setTimeout(() => buscadorCliente.current?.focus(), 50);
        }
      } else if (e.key === "F8") {
        e.preventDefault();
        pago.current?.focus();
      } else if (e.key === "F9" || (e.ctrlKey && e.key === "Enter")) {
        e.preventDefault();
        confirmar();
      }
    };
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  });

  // ---------------------------------------------------------------- ítems
  /** RF-V3 y RF-V4: agrega un producto; si ya está suma la cantidad, sin superar la existencia. */
  function agregar(producto: Producto) {
    const pedida = Math.max(1, Math.floor(Number(cantidad) || 1));
    const existente = renglones.find((r) => r.producto.id === producto.id);
    const nueva = (existente?.cantidad ?? 0) + pedida;
    if (nueva > producto.existencia) {
      toast.error(`Solo hay ${producto.existencia} unidades de ${producto.descripcion}.`);
      return;
    }
    setRenglones(
      existente
        ? renglones.map((r) => (r.producto.id === producto.id ? { ...r, cantidad: nueva } : r))
        : [...renglones, { producto, cantidad: nueva }],
    );
    setTextoProducto("");
    setProductos([]);
    setCantidad("1");
    buscador.current?.focus();
  }

  function cambiarCantidad(id: number, valor: string) {
    const n = Math.floor(Number(valor));
    setRenglones(
      renglones.map((r) => {
        if (r.producto.id !== id) return r;
        if (n > r.producto.existencia) {
          toast.error(`Solo hay ${r.producto.existencia} unidades.`);
          return { ...r, cantidad: r.producto.existencia };
        }
        return { ...r, cantidad: n > 0 ? n : 1 };
      }),
    );
  }

  const quitar = (id: number) => setRenglones(renglones.filter((r) => r.producto.id !== id));

  /** Vuelve la pantalla a cero (no graba nada: la factura recién existe al confirmar). */
  function descartar() {
    setRenglones([]);
    setCliente(null);
    setForma("contado");
    setMontoRecibido("");
    setTarjeta({ tipo: "debito", marca: MARCAS[0], ultimos4: "" });
    buscador.current?.focus();
  }

  function teclaBuscador(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSeleccionado((s) => Math.min(s + 1, sugerenciasProductos.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSeleccionado((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && !e.ctrlKey) {
      e.preventDefault();
      if (sugerenciasProductos[seleccionado]) agregar(sugerenciasProductos[seleccionado]);
    }
  }

  // ---------------------------------------------------------------- confirmar
  /** RF-V6: envía la venta. El servidor valida todo de nuevo dentro de una transacción. */
  async function confirmar() {
    if (confirmando) return;
    const pago =
      forma === "contado"
        ? { forma, ...(montoRecibido.trim() ? { montoRecibido: pesosACentavos(montoRecibido) } : {}) }
        : forma === "tarjeta"
          ? { forma, tarjeta }
          : { forma };
    const datos = {
      clienteId: cliente?.id ?? null,
      items: renglones.map((r) => ({ productoId: r.producto.id, cantidad: r.cantidad })),
      pago,
    };

    // Mismas reglas de Zod que el servidor
    const resultado = esquemaFactura.safeParse(datos);
    if (!resultado.success) {
      toast.error(erroresDeZod(resultado.error)[0]?.mensaje ?? "Revisá los datos de la venta.");
      return;
    }

    setConfirmando(true);
    try {
      const factura = await api<{ id: number; numeroFormateado: string }>("/api/facturas", "POST", resultado.data);
      toast.success(`Factura ${factura.numeroFormateado} emitida.`);
      router.push(`/ventas/${factura.id}`);
    } catch (e) {
      if (e instanceof ErrorDeApi) {
        // Ejemplo: STOCK_INSUFICIENTE si otro vendedor se llevó la última unidad
        toast.error(e.message);
      } else {
        toast.error("No se pudo confirmar la venta.");
      }
      setConfirmando(false);
    }
  }

  // ---------------------------------------------------------------- pantalla
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        {/* 1. Comprador */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Comprador</CardTitle>
            <span className="font-mono text-xs text-muted-foreground">N° {numero}</span>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {cliente ? (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="font-medium">{cliente.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {documento(cliente.tipoDoc, cliente.nroDoc)}
                    {cliente.cuentaCorriente &&
                      ` · Saldo ${moneda(cliente.saldo)}` +
                        (cliente.disponible != null ? ` · Disponible ${moneda(cliente.disponible)}` : "")}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setCliente(null)}>
                  <X /> Consumidor final
                </Button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Input
                    ref={buscadorCliente}
                    placeholder="Consumidor final — o buscá un cliente por nombre o documento (F4)"
                    value={textoCliente}
                    onChange={(e) => setTextoCliente(e.target.value)}
                  />
                  <Button variant="outline" onClick={() => setAltaCliente(true)}>
                    <UserPlus /> Nuevo
                  </Button>
                </div>
                {sugerenciasClientes.length > 0 && (
                  <div className="flex flex-col rounded-lg border">
                    {sugerenciasClientes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          setCliente(c);
                          setTextoCliente("");
                          setClientes([]);
                        }}
                      >
                        <span>{c.nombre}</span>
                        <span className="text-muted-foreground">{documento(c.tipoDoc, c.nroDoc)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* 2. Ítems */}
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                ref={buscador}
                autoFocus
                placeholder="Buscar producto por código o descripción (F2 · Enter agrega)"
                value={textoProducto}
                onChange={(e) => setTextoProducto(e.target.value)}
                onKeyDown={teclaBuscador}
              />
              <Input
                type="number"
                min={1}
                className="w-20"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                aria-label="Cantidad"
              />
            </div>
            {sugerenciasProductos.length > 0 && (
              <div className="flex flex-col rounded-lg border">
                {sugerenciasProductos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={p.existencia === 0}
                    className={cn(
                      "flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50",
                      i === seleccionado && "bg-muted",
                    )}
                    onClick={() => agregar(p)}
                  >
                    <span>
                      <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span> {p.descripcion}
                    </span>
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <Badge variant="outline">{p.existencia} disp.</Badge>
                      {moneda(p.precio)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-24">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {renglones.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      Todavía no agregaste productos.
                    </TableCell>
                  </TableRow>
                )}
                {renglones.map((r) => (
                  <TableRow key={r.producto.id}>
                    <TableCell>
                      {r.producto.descripcion}
                      <div className="text-xs text-muted-foreground">Disponible: {r.producto.existencia}</div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={r.producto.existencia}
                        value={r.cantidad}
                        onChange={(e) => cambiarCantidad(r.producto.id, e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="text-right">{moneda(r.producto.precio)}</TableCell>
                    <TableCell className="text-right">{moneda(r.producto.precio * r.cantidad)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" onClick={() => quitar(r.producto.id)} aria-label="Quitar">
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* 3. Forma de pago y total */}
      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader>
          <CardTitle>Forma de pago</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {(["contado", "tarjeta", "cuenta_corriente"] as const).map((f) => (
              <button
                key={f}
                ref={f === "contado" ? pago : undefined}
                type="button"
                disabled={f === "cuenta_corriente" && !puedeCuentaCorriente}
                onClick={() => setForma(f)}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-medium disabled:opacity-40",
                  forma === f ? "bg-background shadow-sm" : "text-muted-foreground",
                )}
              >
                {{ contado: "Contado", tarjeta: "Tarjeta", cuenta_corriente: "Cta. cte." }[f]}
              </button>
            ))}
          </div>
          {!puedeCuentaCorriente && (
            <p className="text-xs text-muted-foreground">
              Cuenta corriente: solo para clientes registrados y habilitados.
            </p>
          )}

          {forma === "contado" && (
            <>
              <Campo etiqueta="Monto recibido ($)">
                <Input
                  inputMode="decimal"
                  placeholder={(total / 100).toFixed(2).replace(".", ",")}
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                />
              </Campo>
              <div className="flex justify-between text-sm">
                <span>Vuelto</span>
                <span className={vuelto < 0 ? "font-medium text-destructive" : "font-medium"}>
                  {vuelto < 0 ? "Monto insuficiente" : moneda(vuelto)}
                </span>
              </div>
            </>
          )}

          {forma === "tarjeta" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Campo etiqueta="Tipo">
                  <SelectNativo
                    value={tarjeta.tipo}
                    onChange={(e) => setTarjeta({ ...tarjeta, tipo: e.target.value })}
                    opciones={[
                      { valor: "debito", texto: "Débito" },
                      { valor: "credito", texto: "Crédito" },
                    ]}
                    className="sm:w-full"
                  />
                </Campo>
                <Campo etiqueta="Marca">
                  <SelectNativo
                    value={tarjeta.marca}
                    onChange={(e) => setTarjeta({ ...tarjeta, marca: e.target.value })}
                    opciones={MARCAS.map((m) => ({ valor: m, texto: m }))}
                    className="sm:w-full"
                  />
                </Campo>
              </div>
              {/* Regla 9: NUNCA se pide el número completo */}
              <Campo etiqueta="Últimos 4 dígitos">
                <Input
                  inputMode="numeric"
                  maxLength={4}
                  value={tarjeta.ultimos4}
                  onChange={(e) => setTarjeta({ ...tarjeta, ultimos4: e.target.value.replace(/\D/g, "") })}
                />
              </Campo>
            </>
          )}

          {/* Cuenta corriente: cómo queda el saldo del cliente (regla 7) */}
          {forma === "cuenta_corriente" && cliente && (
            <div className="flex flex-col gap-1 text-sm">
              <Renglon etiqueta="Saldo actual" valor={moneda(cliente.saldo)} />
              <Renglon etiqueta="Esta factura" valor={`+ ${moneda(total)}`} />
              <Renglon etiqueta="Saldo resultante" valor={moneda(cliente.saldo + total)} fuerte />
              <Renglon
                etiqueta="Límite de crédito"
                valor={cliente.limiteCredito == null ? "Sin límite" : moneda(cliente.limiteCredito)}
              />
              {cliente.limiteCredito != null && cliente.saldo + total > cliente.limiteCredito && (
                <span className="font-medium text-destructive">Supera el límite de crédito.</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1 border-t pt-4 text-sm">
            <Renglon etiqueta="Unidades" valor={String(renglones.reduce((s, r) => s + r.cantidad, 0))} />
            <Renglon etiqueta="Número" valor={`${numero} (al confirmar)`} />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold whitespace-nowrap">{moneda(total)}</span>
          </div>
          <Button size="lg" onClick={confirmar} disabled={confirmando || renglones.length === 0}>
            {confirmando ? "Confirmando…" : "Confirmar factura (F9)"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Al confirmar se verifica el stock, se descuenta y se asigna el número.
          </p>
          <Button variant="ghost" size="sm" onClick={descartar} disabled={renglones.length === 0 && !cliente}>
            <X /> Descartar venta
          </Button>
        </CardContent>
      </Card>

      {/* RF-V2: alta de cliente en el momento, sin perder la venta en curso */}
      <Dialog open={altaCliente} onOpenChange={setAltaCliente}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <FormularioCliente
            alGuardar={(c) => {
              setCliente(c);
              setAltaCliente(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
