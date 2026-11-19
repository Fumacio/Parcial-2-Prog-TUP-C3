"use client";
// Alta y edición de productos (RF-P2). Solo lo ve el administrador,
// pero el permiso REAL lo verifica el servicio en el servidor.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Campo } from "@/components/comunes/campo";
import { SelectNativo } from "@/components/comunes/select-nativo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { esquemaProductoAlta, esquemaProductoEdicion } from "@/lib/esquemas";
import { centavosAPesos, pesosACentavos } from "@/lib/formato";
import type { Producto } from "@/servicios/productos";

type Props = {
  producto?: Producto; // si viene, es edición
  categorias: { id: number; nombre: string }[];
  children: React.ReactNode; // botón que abre el diálogo
};

/** "" -> undefined (así Zod dice "Es obligatorio"), "12" -> 12 */
const numero = (texto: string) => (texto.trim() === "" ? undefined : Number(texto));

export function DialogoProducto({ producto, categorias, children }: Props) {
  const router = useRouter();
  const esEdicion = !!producto;
  const [abierto, setAbierto] = useState(false);
  const [v, setV] = useState({
    codigo: producto?.codigo ?? "",
    descripcion: producto?.descripcion ?? "",
    categoriaId: producto ? String(producto.categoria.id) : "",
    precio: centavosAPesos(producto?.precio),
    stockMinimo: producto ? String(producto.stockMinimo) : "0",
    stockInicial: "0",
  });
  const { errores, enviando, enviar } = useFormulario(esEdicion ? esquemaProductoEdicion : esquemaProductoAlta);
  const cambiar = (campo: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV({ ...v, [campo]: e.target.value });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const datos = {
      codigo: v.codigo,
      descripcion: v.descripcion,
      categoriaId: numero(v.categoriaId),
      precio: v.precio.trim() === "" ? undefined : pesosACentavos(v.precio), // pesos -> centavos
      stockMinimo: numero(v.stockMinimo),
      ...(esEdicion ? {} : { stockInicial: numero(v.stockInicial) }),
    };
    const ok = await enviar(
      datos,
      (d) => (esEdicion ? api(`/api/productos/${producto!.id}`, "PATCH", d) : api("/api/productos", "POST", d)),
      esEdicion ? "Producto actualizado." : "Producto creado.",
    );
    if (ok) {
      setAbierto(false);
      router.refresh(); // vuelve a pedir los datos de la página
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{esEdicion ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={guardar} className="flex flex-col gap-3">
          <Campo etiqueta="Código" error={errores.codigo}>
            <Input value={v.codigo} onChange={cambiar("codigo")} autoFocus />
          </Campo>
          <Campo etiqueta="Descripción" error={errores.descripcion}>
            <Input value={v.descripcion} onChange={cambiar("descripcion")} />
          </Campo>
          <Campo etiqueta="Categoría" error={errores.categoriaId}>
            <SelectNativo
              value={v.categoriaId}
              onChange={cambiar("categoriaId")}
              vacio="Elegir…"
              opciones={categorias.map((c) => ({ valor: String(c.id), texto: c.nombre }))}
              className="sm:w-full"
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Precio de venta ($)" error={errores.precio}>
              <Input value={v.precio} onChange={cambiar("precio")} inputMode="decimal" placeholder="0,00" />
            </Campo>
            <Campo etiqueta="Stock mínimo" error={errores.stockMinimo}>
              <Input type="number" min={0} value={v.stockMinimo} onChange={cambiar("stockMinimo")} />
            </Campo>
          </div>
          {!esEdicion && (
            <Campo etiqueta="Stock inicial (se registra como ingreso)" error={errores.stockInicial}>
              <Input type="number" min={0} value={v.stockInicial} onChange={cambiar("stockInicial")} />
            </Campo>
          )}
          <DialogFooter>
            <Button type="submit" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
