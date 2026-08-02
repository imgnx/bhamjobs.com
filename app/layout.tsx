import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ClientShell from "./ClientShell";

const geistSans = localFont({
  src: "../assets/fonts/Geist/Geist-VariableFont_wght.ttf",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "../assets/fonts/Geist/static/Geist-Regular.ttf",
  variable: "--font-geist-mono",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "bhamjobs",
  description: "Birmingham jobs and assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        data-theme="trivium-rhetoric"
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen grid grid-cols-1 md:grid-cols-[280px_1fr] antialiased`}
      >
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
