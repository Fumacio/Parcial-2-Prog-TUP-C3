// /ventas/nueva — Nueva venta (RF-V1). Toda la lógica de pantalla está en el componente.
import { Encabezado } from "@/components/comunes/encabezado";
import { Pila } from "@/components/comunes/maquetacion";
import { NuevaVenta } from "@/components/ventas/nueva-venta";

export default function PaginaNuevaVenta() {
  return (
    <Pila>
      <Encabezado
        titulo="Nueva venta"
        descripcion="El número se asigna al confirmar. Teclado: F2 producto, F4 cliente, F8 pago, F9 confirmar."
      />
      <NuevaVenta />
    </Pila>
  );
}
