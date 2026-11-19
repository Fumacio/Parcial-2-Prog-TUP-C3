"use client";
// Abre el diálogo de impresión del navegador. El panel lateral y los botones
// tienen la clase "print:hidden", así que en el papel sale solo el comprobante.
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotonImprimir() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <Printer /> Imprimir
    </Button>
  );
}
