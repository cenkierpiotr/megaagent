import type { Metadata } from "next";
import "./globals.css";
import React from "react";

export const metadata: Metadata = {
  title: "Claw-Omni-OS | Autonomous AI Engine",
  description: "Advanced Autonomous Agent Orchestration System — RTX 3060 Powered",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#0a0a0b] text-slate-100 min-h-screen overflow-hidden font-[Inter,_system-ui,_sans-serif]">
        {children}
      </body>
    </html>
  );
}
