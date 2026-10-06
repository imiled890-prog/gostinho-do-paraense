import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gostinho do Paraense | Comidas Típicas do Pará em Curitiba",
  description: "Culinária, tradição e o orgulho de ser paraense. Tacacá, Vatapá, Maniçoba, Açaí e muito mais! Peça pelo WhatsApp.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
