import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import { CustomCursor } from "@/components/CustomCursor";
import "./globals.css";

/**
 * Two families, two jobs.
 *
 * Inter carries every control the user operates — nav, filters, buttons,
 * inputs, labels, metadata. Newsreader carries the editorial voice: display
 * headings, page titles, and (from Phase 2) country names on the cards.
 *
 * Both are declared as variable fonts with no `weight` array on purpose.
 * Naming weights explicitly makes next/font emit one static file per weight;
 * omitting it ships a single variable file covering the family's whole range,
 * which is both fewer requests and fewer bytes than the four static cuts this
 * design needs. `display: "swap"` plus next/font's automatic size-adjust
 * fallback metrics keeps the swap from shifting layout.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Keyrise | Dubai / UAE Visa for Indians",
  description:
    "Apply online for Dubai / UAE Visa for Indians with expert document checks, secure uploads, and real-time status tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SmoothScroll>
          <CustomCursor />
          {children}
        </SmoothScroll>
      </body>
    </html>
  );
}
