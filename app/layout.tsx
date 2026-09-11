import { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { interTight, livvic } from "@/lib/font";
import { NoticeBanner } from "@/components/notice-banner";

export const metadata: Metadata = {
  title: "Fullbleed by Basilpot | Publish content without the CMS overhead.",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [
      { url: "/android-chrome-192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={livvic.className}>
      <body className={`${livvic.variable} ${interTight.variable} antialiased`}>
        <NoticeBanner />
        {children}
      </body>
    </html>
  );
}
