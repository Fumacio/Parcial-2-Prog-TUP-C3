// Layout raíz: html, fuente y el contenedor de avisos (toasts). Lo usan TODAS las páginas,
// incluida /login. El panel lateral está en (sistema)/layout.tsx, no acá.
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Las variables --font-sans y --font-geist-mono las usa globals.css (tema de shadcn)
const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema comercial",
  description: "Facturación, stock y cuenta corriente de clientes",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
