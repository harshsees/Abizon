import type { Metadata, Viewport } from "next";
import {
  Inter,
  JetBrains_Mono,
  Newsreader,
  Playfair_Display,
  Poppins,
} from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

/**
 * Five families, five jobs.
 *
 * Inter carries every control the user operates — nav, filters, buttons,
 * inputs, labels, metadata. Newsreader carries the editorial voice: display
 * headings, page titles, and (from Phase 2) country names on the cards.
 *
 * Inter and Newsreader are declared as variable fonts with no `weight` array
 * on purpose. Naming weights explicitly makes next/font emit one static file
 * per weight; omitting it ships a single variable file covering the family's
 * whole range, which is both fewer requests and fewer bytes than the four
 * static cuts this design needs. `display: "swap"` plus next/font's automatic size-adjust
 * fallback metrics keeps the swap from shifting layout.
 *
 * Poppins is the exception, and it is loaded for exactly one string: the
 * `Abizon` wordmark. The logo needs the geometric, circular-bowl grotesque the
 * reference mark is set in, which neither Inter (neo-grotesque) nor Newsreader
 * (serif) can imitate — `font-black tracking-tighter` on Inter was the previous
 * attempt and it reads as bold UI text, not as a mark. It ships two static cuts
 * rather than a variable file because Google serves Poppins as static only, and
 * two weights for six words on a page is cheaper than the alternative of a
 * hand-drawn SVG wordmark nobody can restyle.
 *
 * Playfair Display and JetBrains Mono were added for the application flow, and
 * they are the two registers it was missing.
 *
 * Playfair is the display face for the three screens that stop being a form —
 * "Passport, photo page up", "Look ahead, straight at the camera", "Review
 * passport details". Newsreader is a reading serif: low contrast, generous
 * spacing, built to be comfortable at 16px over many lines. At 36px on a white
 * page with four words on it, comfortable is not the job — presence is, and
 * that wants the thick-thin contrast of a Didone. Newsreader keeps the rest of
 * the site, where it is reading text and correct.
 *
 * JetBrains Mono carries the technical register: the scan's status line, the
 * machine-readable zone, reference numbers. `font-mono` previously resolved to
 * whatever the OS had — Consolas on Windows, Menlo on a Mac — so the one place
 * the product deliberately looks like a machine looked like a different machine
 * on every device.
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

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "abizon | Dubai / UAE Visa for Indians",
  // "real-time status tracking" was in this description until Phase 6C.
  // Phase 6B established there is no status service — `lookupApplicationStatus`
  // returns `available: false` for every reference — so the claim was false in
  // the one place search engines and link previews quote verbatim.
  description:
    "Apply online for a Dubai / UAE visa from India. Document checks against the destination's requirements, transparent government and service fees, and on-time delivery or the abizon fee is waived.",
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
      className={`${inter.variable} ${newsreader.variable} ${poppins.variable} ${playfair.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
