import { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { livvic } from "@/lib/font";

export const metadata: Metadata = {
  title: "Ash and Moss - Hello inquiries. Bye-bye spreadsheet chaos",
  icons: "/dashboard-favicon.svg",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={livvic.className}>
      <body className={`${livvic.variable} antialiased`}>{children}</body>
    </html>
  );
}
