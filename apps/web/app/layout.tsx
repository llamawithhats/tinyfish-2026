import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoIntern",
  description: "TinyFish-powered internship discovery, packet generation, and application automation."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
