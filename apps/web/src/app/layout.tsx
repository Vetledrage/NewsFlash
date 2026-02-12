import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "@/lib/query/QueryProvider";

export const metadata: Metadata = {
  title: "NewsFlash",
  description: "Short-form news in a TikTok-style feed"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

