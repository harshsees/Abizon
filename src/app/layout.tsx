import type { Metadata, Viewport } from "next";
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
  title: "Abizon | Dubai / UAE Visa for Indians",
  // "real-time status tracking" was in this description until Phase 6C.
  // Phase 6B established there is no status service — `lookupApplicationStatus`
  // returns `available: false` for every reference — so the claim was false in
  // the one place search engines and link previews quote verbatim.
  description:
    "Apply online for a Dubai / UAE visa from India. Document checks against the destination's requirements, transparent government and service fees, and on-time delivery or the Abizon fee is waived.",
};

/**
 * `interactiveWidget: "resizes-content"` is the mobile-keyboard fix.
 *
 * The application's primary CTA is a `position: fixed` bar at the bottom of the
 * viewport below `md`. By default an on-screen keyboard overlays the visual
 * viewport without resizing the layout viewport, so that bar ends up UNDER the
 * keyboard — invisible and unreachable — exactly while the user is typing into
 * the form it belongs to. Resizing the content instead keeps the bar sitting on
 * top of the keyboard, which is where a thumb expects it.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
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
