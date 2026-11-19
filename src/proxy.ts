// Proxy de Next.js (antes llamado "middleware"). Es la PRIMERA barrera (sección 10.5):
// si no está la cookie de sesión, redirige a /login antes de mostrar cualquier página.
// No valida la firma ni el rol: eso lo hacen la página (exigirUsuario) y cada servicio.
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tieneCookie = request.cookies.has("sesion");

  // La API responde 401 en JSON por su cuenta (no se redirige)
  if (pathname.startsWith("/api")) return NextResponse.next();

  if (!tieneCookie && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Todo menos archivos estáticos de Next y el favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
