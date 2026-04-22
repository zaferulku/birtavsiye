import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "./components/SessionProviderWrapper";
import { ChatWidget } from "@/components/ChatWidget";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const syne = Syne({ subsets: ["latin"], variable: "--font-syne" });

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
      <body className={`${dmSans.variable} ${syne.variable} antialiased`}>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
        <ChatWidget />
      </body>
    </html>
  );
}
