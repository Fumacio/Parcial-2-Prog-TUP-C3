"use client";
// Alta y edición de usuarios (RF-U4). Solo administrador.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Campo } from "@/components/comunes/campo";
import { SelectNativo } from "@/components/comunes/select-nativo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { esquemaUsuarioAlta, esquemaUsuarioEdicion } from "@/lib/esquemas";

type UsuarioFila = { id: number; nombre: string; email: string; rol: "admin" | "vendedor" };

export function DialogoUsuario({ usuario, children }: { usuario?: UsuarioFila; children: React.ReactNode }) {
  const router = useRouter();
  const esEdicion = !!usuario;
  const [abierto, setAbierto] = useState(false);
  const [v, setV] = useState({
    nombre: usuario?.nombre ?? "",
    email: usuario?.email ?? "",
    rol: usuario?.rol ?? "vendedor",
    password: "",
  });
  const { errores, enviando, enviar } = useFormulario(esEdicion ? esquemaUsuarioEdicion : esquemaUsuarioAlta);
  const cambiar = (campo: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV({ ...v, [campo]: e.target.value });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    // En la edición no se manda la contraseña (para eso está "Restablecer")
    const datos = esEdicion ? { nombre: v.nombre, email: v.email, rol: v.rol } : v;
    const ok = await enviar(
      datos,
      (d) => (esEdicion ? api(`/api/usuarios/${usuario!.id}`, "PATCH", d) : api("/api/usuarios", "POST", d)),
      esEdicion ? "Usuario actualizado." : "Usuario creado.",
    );
    if (ok) {
      setAbierto(false);
      if (!esEdicion) setV({ nombre: "", email: "", rol: "vendedor", password: "" });
      router.refresh();
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <Campo etiqueta="Nombre" error={errores.nombre}>
            <Input value={v.nombre} onChange={cambiar("nombre")} autoFocus />
          </Campo>
          <Campo etiqueta="Email" error={errores.email}>
            <Input type="email" value={v.email} onChange={cambiar("email")} />
          </Campo>
          <Campo etiqueta="Rol" error={errores.rol}>
            <SelectNativo
              value={v.rol}
              onChange={cambiar("rol")}
              opciones={[
                { valor: "vendedor", texto: "Vendedor" },
                { valor: "admin", texto: "Administrador" },
              ]}
              className="sm:w-full"
            />
          </Campo>
          {!esEdicion && (
            <Campo etiqueta="Contraseña temporal (mínimo 8 caracteres)" error={errores.password}>
              <Input type="password" value={v.password} onChange={cambiar("password")} />
            </Campo>
          )}
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
