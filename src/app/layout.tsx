import type { Metadata } from "next";
import "./globals.css";
import SessionProviderWrapper from "./components/SessionProviderWrapper";
import { ChatBar } from "@/components/chatbot/ChatBar";

export const metadata: Metadata = {
  title: {
    default: "birtavsiye.net — Ürün Öneri & Fiyat Karşılaştırma",
    template: "%s | birtavsiye.net",
  },
  description: "Topluluk tavsiyeleri ve gerçek zamanlı fiyat karşılaştırması",
  metadataBase: new URL("https://birtavsiye.net"),
  openGraph: {
    siteName: "birtavsiye.net",
    locale: "tr_TR",
    type: "website",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
        <ChatBar />
      </body>
    </html>
  );
}
