import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3456"),
  title: { default: "I.STORE — Premium Apple products, retail & wholesale", template: "%s · I.STORE" },
  description: "Shop iPhone, iPad, Mac, Apple Watch and AirPods at retail or wholesale prices. Fast delivery, quotes for business orders.",
  openGraph: { type: "website", siteName: "I.STORE" },
};

export const viewport: Viewport = { themeColor: "#171512", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
