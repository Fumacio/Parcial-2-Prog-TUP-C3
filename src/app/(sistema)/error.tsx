"use client";
// Next.js muestra este componente cuando una página del sistema FALLA al cargar.
import { MensajeError } from "@/components/comunes/estados";
import { Button } from "@/components/ui/button";

export default function ErrorPagina({ reset }: { error: Error; reset: () => void }) {
  return (
    <MensajeError mensaje="No se pudo cargar la página.">
      <Button variant="outline" onClick={reset}>
        Reintentar
      </Button>
    </MensajeError>
  );
}
