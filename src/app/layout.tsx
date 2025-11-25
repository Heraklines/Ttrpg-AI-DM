import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arcane Gamemaster - AI D&D 5e Companion",
  description: "AI-powered D&D 5e companion application with mechanical accuracy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-parchment">
        {children}
      </body>
    </html>
  );
}
