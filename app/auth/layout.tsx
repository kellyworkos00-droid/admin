import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Eterna Admin - Authentication",
  description: "Login or create your seller account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
