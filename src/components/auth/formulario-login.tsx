"use client";
// Formulario de inicio de sesión (RF-U1). Llama a POST /api/auth/login,
// que devuelve la cookie httpOnly de sesión.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wrench } from "lucide-react";
import { Campo } from "@/components/comunes/campo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { COMERCIO } from "@/lib/config";
import { esquemaLogin } from "@/lib/esquemas";

export function FormularioLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { errores, enviando, enviar } = useFormulario(esquemaLogin);

  async function ingresar(e: React.FormEvent) {
    e.preventDefault();
    const ok = await enviar({ email, password }, (datos) => api("/api/auth/login", "POST", datos));
    if (ok) {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Wrench className="size-5" />
            <span className="text-sm font-semibold">{COMERCIO.nombre}</span>
          </div>
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
          <CardDescription>Ingresá con tu email y contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={ingresar} className="flex flex-col gap-4">
            <Campo etiqueta="Email" htmlFor="email" error={errores.email}>
              <Input id="email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
            </Campo>
            <Campo etiqueta="Contraseña" htmlFor="password" error={errores.password}>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Campo>
            <Button type="submit" size="lg" disabled={enviando}>
              {enviando ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
