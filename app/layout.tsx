import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vinci o Paga — Sfida a eliminazione",
  description:
    "Scegli una squadra ogni giornata. Se vince, vai avanti. Se pareggia o perde, sei fuori. Vince chi resta per ultimo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-black/10 px-4 py-4 text-center text-xs text-black/40 dark:border-white/15 dark:text-white/40">
          Vinci o Paga — demo. Pagamenti simulati, nessun denaro reale coinvolto.
        </footer>
      </body>
    </html>
  );
}
