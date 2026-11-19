// Tarjeta de indicador del tablero (RF-T1).
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Indicador({
  titulo,
  valor,
  detalle,
  href,
  alerta,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  href?: string;
  alerta?: boolean;
}) {
  const tarjeta = (
    <Card className={cn("h-full", href && "transition-colors hover:bg-muted/50")}>
      <CardHeader>
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className={cn("text-xl whitespace-nowrap xl:text-2xl", alerta && "text-destructive")}>{valor}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{detalle}</CardContent>
    </Card>
  );
  return href ? <Link href={href}>{tarjeta}</Link> : tarjeta;
}
