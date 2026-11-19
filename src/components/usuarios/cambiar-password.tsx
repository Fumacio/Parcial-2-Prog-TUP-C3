"use client";
// Cambio de la propia contraseña (RF-U5).
import { useState } from "react";
import { Campo } from "@/components/comunes/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { esquemaCambioPassword } from "@/lib/esquemas";

export function CambiarPassword() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const { errores, enviando, enviar } = useFormulario(esquemaCambioPassword);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const ok = await enviar(
      { actual, nueva },
      (d) => api("/api/auth/password", "PUT", d),
      "Contraseña actualizada.",
    );
    if (ok) {
      setActual("");
      setNueva("");
    }
  }

  return (
    <form onSubmit={guardar} className="flex max-w-sm flex-col gap-3">
      <Campo etiqueta="Contraseña actual" error={errores.actual}>
        <Input type="password" value={actual} onChange={(e) => setActual(e.target.value)} />
      </Campo>
      <Campo etiqueta="Contraseña nueva (mínimo 8 caracteres)" error={errores.nueva}>
        <Input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} />
      </Campo>
      <Button type="submit" disabled={enviando} className="self-start">
        Cambiar contraseña
      </Button>
    </form>
  );
}
