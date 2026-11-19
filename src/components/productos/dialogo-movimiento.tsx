"use client";
// Ingreso y egreso manual de stock (RF-P4, RF-P5). Solo administrador.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Campo } from "@/components/comunes/campo";
import { SelectNativo } from "@/components/comunes/select-nativo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { MOTIVOS_EGRESO, MOTIVOS_INGRESO, esquemaMovimientoStock } from "@/lib/esquemas";

export function DialogoMovimiento({
  productoId,
  existencia,
  tipo,
  children,
}: {
  productoId: number;
  existencia: number;
  tipo: "ingreso" | "egreso";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const motivos = tipo === "ingreso" ? MOTIVOS_INGRESO : MOTIVOS_EGRESO;
  const [abierto, setAbierto] = useState(false);
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState(motivos[0]);
  const [observacion, setObservacion] = useState("");
  const { errores, enviando, enviar } = useFormulario(esquemaMovimientoStock);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const datos = { tipo, cantidad: cantidad === "" ? undefined : Number(cantidad), motivo, observacion: observacion || null };
    const ok = await enviar(
      datos,
      (d) => api(`/api/productos/${productoId}/movimientos`, "POST", d),
      tipo === "ingreso" ? "Ingreso registrado." : "Egreso registrado.",
    );
    if (ok) {
      setAbierto(false);
      setCantidad("");
      setObservacion("");
      router.refresh();
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tipo === "ingreso" ? "Ingreso de stock" : "Egreso de stock"}</DialogTitle>
          <DialogDescription>Existencia actual: {existencia} unidades.</DialogDescription>
        </DialogHeader>
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <Campo etiqueta="Cantidad" error={errores.cantidad}>
            <Input type="number" min={1} value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus />
          </Campo>
          <Campo etiqueta="Motivo" error={errores.motivo}>
            <SelectNativo
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              opciones={motivos.map((m) => ({ valor: m, texto: m }))}
              className="sm:w-full"
            />
          </Campo>
          <Campo etiqueta="Observación (opcional)" error={errores.observacion}>
            <Input value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </Campo>
          <DialogFooter>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
