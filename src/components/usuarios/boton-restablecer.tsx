"use client";
// Restablecer contraseña (RF-U5). La contraseña temporal se muestra UNA sola vez.
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { Confirmar } from "@/components/comunes/confirmar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, ErrorDeApi } from "@/lib/cliente-api";

export function BotonRestablecer({ usuarioId, nombre }: { usuarioId: number; nombre: string }) {
  const [temporal, setTemporal] = useState<string | null>(null);

  async function restablecer() {
    try {
      const r = await api<{ passwordTemporal: string }>(`/api/usuarios/${usuarioId}/reset-password`, "POST");
      setTemporal(r.passwordTemporal);
    } catch (e) {
      toast.error(e instanceof ErrorDeApi ? e.message : "Ocurrió un error.");
    }
  }

  return (
    <>
      <Confirmar
        titulo={`¿Restablecer la contraseña de ${nombre}?`}
        descripcion="Se genera una contraseña temporal nueva. La anterior deja de funcionar."
        textoConfirmar="Restablecer"
        alConfirmar={restablecer}
      >
        <Button variant="ghost" size="sm">
          <KeyRound /> Contraseña
        </Button>
      </Confirmar>
      <Dialog open={temporal !== null} onOpenChange={() => setTemporal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contraseña temporal</DialogTitle>
            <DialogDescription>Anotala y pasásela a {nombre}: no se vuelve a mostrar.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-muted p-4 text-center font-mono text-xl">{temporal}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
