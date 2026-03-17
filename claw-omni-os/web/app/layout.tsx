import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claw-Omni-OS | AI Engine Dashboard",
  description: "Advanced Autonomous Agent Orchestration System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className="antialiased bg-[#0a0a0b] text-slate-100 min-h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
