import type { Metadata, Viewport } from "next";
import "./globals.css";
import { auth } from "@/auth";
import { LocalStoreProvider } from "@/lib/local-store-context";
import { cacheScopeForEmail } from "@/server/cache-scope";

export const metadata: Metadata = {
  title: "RenoAI — Home repair, made clear",
  description: "Turn a photo and a few words into a contractor-ready repair brief.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f4f1ea" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const email = (await auth())?.user?.email;
  const scope = email ? cacheScopeForEmail(email) : null;
  return (
    <html lang="en">
      <body><LocalStoreProvider scope={scope}>{children}</LocalStoreProvider></body>
    </html>
  );
}
