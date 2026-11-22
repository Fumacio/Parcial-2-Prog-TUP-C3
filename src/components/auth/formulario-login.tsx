"use client";
// Formulario de inicio de sesión (RF-U1). Llama a POST /api/auth/login,
// que devuelve la cookie httpOnly de sesión.
//
// Modo demo: dos botones entran como administrador o vendedor de prueba sin escribir nada.
// No hay ningún acceso especial: mandan el email y la contraseña de los usuarios de prueba
// (USUARIOS_DEMO en lib/config.ts) al mismo POST /api/auth/login que el formulario.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck, Store, Wrench } from "lucide-react";
import { Campo } from "@/components/comunes/campo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { COMERCIO, USUARIOS_DEMO } from "@/lib/config";
import { esquemaLogin } from "@/lib/esquemas";

export function FormularioLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { errores, enviando, enviar } = useFormulario(esquemaLogin);

  /** Inicia sesión con los datos indicados y, si sale bien, va al tablero. */
  async function entrar(datosLogin: { email: string; password: string }) {
    const ok = await enviar(datosLogin, (datos) => api("/api/auth/login", "POST", datos));
    if (ok) {
      router.push("/");
      router.refresh();
    }
  }

  function ingresar(e: React.FormEvent) {
    e.preventDefault();
    entrar({ email, password });
  }

  /** Modo demo: entra con el usuario de prueba del rol elegido. */
  function entrarDemo(rol: keyof typeof USUARIOS_DEMO) {
    const { email, password } = USUARIOS_DEMO[rol];
    entrar({ email, password });
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
        <CardContent className="flex flex-col gap-4">
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

          {/* Modo demo */}
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">o probá el sistema en modo demo</span>
            <Separator className="flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" disabled={enviando} onClick={() => entrarDemo("admin")}>
              <ShieldCheck /> Administrador
            </Button>
            <Button type="button" variant="outline" disabled={enviando} onClick={() => entrarDemo("vendedor")}>
              <Store /> Vendedor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
