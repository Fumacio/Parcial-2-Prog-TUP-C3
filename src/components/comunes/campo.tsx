// Campo de formulario: etiqueta + control + mensaje de error JUNTO al campo (sección 8).
import { Label } from "@/components/ui/label";

export function Campo({
  etiqueta,
  error,
  htmlFor,
  children,
}: {
  etiqueta: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{etiqueta}</Label>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
