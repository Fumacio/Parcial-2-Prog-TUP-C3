"use client";
// Formulario de alta y edición de clientes (RF-C2).
// Se reutiliza en la ficha del cliente y en el alta rápida desde Nueva venta (RF-V2).
import { useState } from "react";
import { Campo } from "@/components/comunes/campo";
import { SelectNativo } from "@/components/comunes/select-nativo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormulario } from "@/hooks/use-formulario";
import { api } from "@/lib/cliente-api";
import { esquemaClienteAlta, esquemaClienteEdicion } from "@/lib/esquemas";
import { centavosAPesos, pesosACentavos } from "@/lib/formato";
import type { Cliente } from "@/servicios/clientes";

export function FormularioCliente({
  cliente,
  alGuardar,
}: {
  cliente?: Cliente; // si viene, es edición
  alGuardar: (cliente: Cliente) => void;
}) {
  const esEdicion = !!cliente;
  const [v, setV] = useState({
    tipoDoc: cliente?.tipoDoc ?? "DNI",
    nroDoc: cliente?.nroDoc ?? "",
    nombre: cliente?.nombre ?? "",
    domicilio: cliente?.domicilio ?? "",
    telefono: cliente?.telefono ?? "",
    email: cliente?.email ?? "",
    cuentaCorriente: cliente?.cuentaCorriente ?? false,
    limiteCredito: centavosAPesos(cliente?.limiteCredito),
  });
  const { errores, enviando, enviar } = useFormulario(esEdicion ? esquemaClienteEdicion : esquemaClienteAlta);
  const cambiar = (campo: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV({ ...v, [campo]: e.target.value });

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation(); // por si el formulario está dentro de otra pantalla con formulario
    const datos = {
      ...v,
      // límite vacío = sin límite (null); si no, pesos -> centavos
      limiteCredito: v.limiteCredito.trim() === "" ? null : pesosACentavos(v.limiteCredito),
    };
    let guardado: Cliente | undefined;
    const ok = await enviar(
      datos,
      async (d) => {
        guardado = esEdicion
          ? await api<Cliente>(`/api/clientes/${cliente!.id}`, "PATCH", d)
          : await api<Cliente>("/api/clientes", "POST", d);
      },
      esEdicion ? "Cliente actualizado." : "Cliente creado.",
    );
    if (ok && guardado) alGuardar(guardado);
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-3">
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <Campo etiqueta="Tipo" error={errores.tipoDoc}>
          <SelectNativo
            value={v.tipoDoc}
            onChange={cambiar("tipoDoc")}
            opciones={[
              { valor: "DNI", texto: "DNI" },
              { valor: "CUIT", texto: "CUIT" },
            ]}
          />
        </Campo>
        <Campo etiqueta="Número de documento" error={errores.nroDoc}>
          <Input value={v.nroDoc} onChange={cambiar("nroDoc")} autoFocus placeholder="28.456.123" />
        </Campo>
      </div>
      <Campo etiqueta="Nombre o razón social" error={errores.nombre}>
        <Input value={v.nombre} onChange={cambiar("nombre")} />
      </Campo>
      <Campo etiqueta="Domicilio" error={errores.domicilio}>
        <Input value={v.domicilio} onChange={cambiar("domicilio")} />
      </Campo>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="Teléfono" error={errores.telefono}>
          <Input value={v.telefono} onChange={cambiar("telefono")} />
        </Campo>
        <Campo etiqueta="Email" error={errores.email}>
          <Input type="email" value={v.email} onChange={cambiar("email")} />
        </Campo>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="cuentaCorriente"
          checked={v.cuentaCorriente}
          onCheckedChange={(c) => setV({ ...v, cuentaCorriente: c === true })}
        />
        <Label htmlFor="cuentaCorriente">Habilitado para cuenta corriente</Label>
      </div>
      {errores.cuentaCorriente && <span className="text-xs text-destructive">{errores.cuentaCorriente}</span>}
      {v.cuentaCorriente && (
        <Campo etiqueta="Límite de crédito ($) — vacío = sin límite" error={errores.limiteCredito}>
          <Input value={v.limiteCredito} onChange={cambiar("limiteCredito")} inputMode="decimal" placeholder="0,00" />
        </Campo>
      )}
      <Button type="submit" disabled={enviando} className="self-end">
        {enviando ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
