"use client";
// Alta y edición de categorías (RF-P7). Solo administrador.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Campo } from "@/components/comunes/campo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { esquemaCategoria } from "@/lib/esquemas";

/** Diálogo de alta (sin categoría) o de cambio de nombre (con categoría). */
export function DialogoCategoria({ categoria }: { categoria?: { id: number; nombre: string } }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const { errores, enviando, enviar } = useFormulario(esquemaCategoria);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const ok = await enviar(
      { nombre },
      (d) => (categoria ? api(`/api/categorias/${categoria.id}`, "PATCH", d) : api("/api/categorias", "POST", d)),
      categoria ? "Categoría actualizada." : "Categoría creada.",
    );
    if (ok) {
      setAbierto(false);
      if (!categoria) setNombre("");
      router.refresh();
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {categoria ? (
          <Button variant="ghost" size="sm">
            <Pencil /> Editar
          </Button>
        ) : (
          <Button>
            <Plus /> Nueva categoría
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <Campo etiqueta="Nombre" error={errores.nombre}>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          </Campo>
          <DialogFooter>
            <Button type="submit" disabled={enviando}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
