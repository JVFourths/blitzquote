import type { Metadata, Viewport } from "next";
import { Syne, Outfit } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "BlitzQuote — Quotes at the Speed of AI",
    template: "%s | BlitzQuote",
  },
  description:
    "Connect with UK tradespeople instantly. AI agents find, compare, and book qualified local tradespeople directly into their calendar.",
  keywords: [
    "tradespeople",
    "plumber",
    "electrician",
    "UK",
    "AI",
    "booking",
    "quotes",
    "handyman",
    "builder",
  ],
  authors: [{ name: "BlitzQuote" }],
  openGraph: {
    title: "BlitzQuote — Quotes at the Speed of AI",
    description:
      "Let AI agents find and book UK tradespeople directly into their calendar.",
    url: "https://blitzquote.co.uk",
    siteName: "BlitzQuote",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BlitzQuote — Quotes at the Speed of AI",
    description:
      "Let AI agents find and book UK tradespeople directly into their calendar.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0e1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${outfit.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
