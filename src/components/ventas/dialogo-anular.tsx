"use client";
// Anulación de factura (RF-V9): solo admin, motivo obligatorio, con confirmación.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban } from "lucide-react";
import { Campo } from "@/components/comunes/campo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { esquemaAnulacion } from "@/lib/esquemas";

export function DialogoAnular({ facturaId, numero }: { facturaId: number; numero: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const { errores, enviando, enviar } = useFormulario(esquemaAnulacion);

  async function anular(e: React.FormEvent) {
    e.preventDefault();
    const ok = await enviar(
      { motivo },
      (d) => api(`/api/facturas/${facturaId}/anulacion`, "POST", d),
      `Factura ${numero} anulada.`,
    );
    if (ok) {
      setAbierto(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Ban /> Anular
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Anular la factura {numero}?</DialogTitle>
          <DialogDescription>
            Se reingresa el stock y, si fue en cuenta corriente, se acredita el total al cliente. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={anular} className="flex flex-col gap-3">
          <Campo etiqueta="Motivo" error={errores.motivo}>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus />
          </Campo>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={enviando}>
              {enviando ? "Anulando…" : "Anular factura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
