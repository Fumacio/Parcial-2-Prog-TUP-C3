// Layout de todas las pantallas del sistema (todo menos /login).
// La carpeta "(sistema)" entre paréntesis es un "grupo de rutas": agrupa páginas
// para compartir este layout SIN agregar "/sistema" a la URL.
//
// Segunda barrera de seguridad (sección 10.5): si la cookie no es válida o el usuario
// fue desactivado, exigirUsuario() redirige al login.
import { Estructura } from "@/components/layout/estructura";
import { exigirUsuario } from "@/lib/sesion";
import { contarBajoMinimo } from "@/servicios/productos";

export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const bajoMinimo = await contarBajoMinimo(usuario); // contador junto a "Productos"
  return (
    <Estructura usuario={usuario} bajoMinimo={bajoMinimo}>
      {children}
    </Estructura>
  );
}
