"use client";
// Diálogo con el formulario de cliente. Al guardar: recarga la página o va a la ficha.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Cliente } from "@/servicios/clientes";
import { FormularioCliente } from "./formulario-cliente";

export function DialogoCliente({ cliente, children }: { cliente?: Cliente; children: React.ReactNode }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);

  function alGuardar(guardado: Cliente) {
    setAbierto(false);
    if (cliente) router.refresh();
    else router.push(`/clientes/${guardado.id}`);
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        </DialogHeader>
        <FormularioCliente cliente={cliente} alGuardar={alGuardar} />
      </DialogContent>
    </Dialog>
  );
}
