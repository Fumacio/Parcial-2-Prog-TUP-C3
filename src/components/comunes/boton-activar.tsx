"use client";
// Botón genérico de baja lógica / reactivación (regla 12: nunca se borra).
// Manda PATCH { [campo]: false|true } a la URL indicada, con confirmación previa.
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ErrorDeApi } from "@/lib/cliente-api";
import { Confirmar } from "./confirmar";

export function BotonActivar({
  url,
  activo,
  nombre,
  campo = "activo",
}: {
  url: string;
  activo: boolean;
  nombre: string; // "el producto", "la categoría"...
  campo?: "activo" | "activa";
}) {
  const router = useRouter();

  async function cambiar() {
    try {
      await api(url, "PATCH", { [campo]: !activo });
      toast.success(activo ? "Dado de baja." : "Reactivado.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ErrorDeApi ? e.message : "Ocurrió un error.");
    }
  }

  if (!activo) {
    return (
      <Button variant="outline" size="sm" onClick={cambiar}>
        Reactivar
      </Button>
    );
  }
  return (
    <Confirmar
      titulo={`¿Dar de baja ${nombre}?`}
      descripcion="Queda inactivo pero conserva su historial. Se puede reactivar después."
      textoConfirmar="Dar de baja"
      alConfirmar={cambiar}
    >
      <Button variant="destructive" size="sm">
        Dar de baja
      </Button>
    </Confirmar>
  );
}
