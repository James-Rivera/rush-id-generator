import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rush ID Generator",
  description: "Rush ID Generator using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
