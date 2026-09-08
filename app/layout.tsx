import { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { interTight, livvic } from "@/lib/font";

export const metadata: Metadata = {
  title: "Keybud — CMS",
  icons: "/icon.svg",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={livvic.className}>
      <body className={`${livvic.variable} ${interTight.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
