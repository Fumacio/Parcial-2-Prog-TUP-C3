"use client";
// Registrar un pago en cuenta corriente (RF-C5). Al terminar abre el recibo para imprimir.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Campo } from "@/components/comunes/campo";
import { SelectNativo } from "@/components/comunes/select-nativo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { MEDIOS_PAGO, esquemaPago } from "@/lib/esquemas";
import { centavosAPesos, moneda, nombresMedioPago, pesosACentavos } from "@/lib/formato";

export function DialogoPago({ clienteId, saldo, children }: { clienteId: number; saldo: number; children: React.ReactNode }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [importe, setImporte] = useState(centavosAPesos(saldo));
  const [medio, setMedio] = useState<string>("efectivo");
  const [observacion, setObservacion] = useState("");
  const { errores, enviando, enviar } = useFormulario(esquemaPago);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    let reciboId = 0;
    const ok = await enviar(
      { importe: importe.trim() === "" ? undefined : pesosACentavos(importe), medio, observacion: observacion || null },
      async (d) => {
        reciboId = (await api<{ id: number }>(`/api/clientes/${clienteId}/pagos`, "POST", d)).id;
      },
      "Pago registrado.",
    );
    if (ok) {
      setAbierto(false);
      router.push(`/clientes/recibos/${reciboId}`);
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>Deuda actual: {moneda(saldo)}. El pago no puede superarla.</DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <Campo etiqueta="Importe ($)" error={errores.importe}>
            <Input value={importe} onChange={(e) => setImporte(e.target.value)} inputMode="decimal" autoFocus />
          </Campo>
          <Campo etiqueta="Medio de pago" error={errores.medio}>
            <SelectNativo
              value={medio}
              onChange={(e) => setMedio(e.target.value)}
              opciones={MEDIOS_PAGO.map((m) => ({ valor: m, texto: nombresMedioPago[m] }))}
              className="sm:w-full"
            />
          </Campo>
          <Campo etiqueta="Observación (opcional)" error={errores.observacion}>
            <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </Campo>
          <DialogFooter>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Registrando…" : "Registrar pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
