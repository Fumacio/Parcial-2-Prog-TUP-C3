// Datos fijos del comercio. Cambiar el punto de venta (por ejemplo a 0002) se hace SOLO acá.
export const PUNTO_VENTA = 1;

export const COMERCIO = {
  nombre: "Ferretería El Tornillo",
  domicilio: "San Martín 1234, San Miguel de Tucumán",
  cuit: "30-71234567-8",
  telefono: "381 400-1234",
};

// Usuarios de prueba que crea el script de datos iniciales (src/db/seed.ts).
// Los usan también los botones "Entrar como ... (demo)" del login.
// Si se cambia una contraseña desde /perfil, el botón de demo de ese usuario deja de funcionar.
export const USUARIOS_DEMO = {
  admin: { nombre: "Laura Méndez", email: "laura@ferreteria.test", password: "admin1234" },
  vendedor: { nombre: "Pablo Ruiz", email: "pablo@ferreteria.test", password: "vendedor1234" },
} as const;
