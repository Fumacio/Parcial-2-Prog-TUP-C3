import Link from "next/link";
import { Vacio } from "@/components/comunes/estados";
import { Button } from "@/components/ui/button";

export default function NoEncontrado() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Vacio mensaje="Lo que buscás no existe." />
      <Button variant="outline" asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
