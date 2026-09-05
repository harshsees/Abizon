"use client";

/**
 * The site header. One component, every page.
 *
 * This replaces the `NewHeader` / `Header` split, which was two unrelated
 * implementations of the same chrome: the homepage had working search wiring
 * and tab state, the country pages had a search overlay whose results were
 * inert `<li>`s and a stale "VC" logo box linking to `#`. Fixing anything
 * meant fixing it twice, and in practice it got fixed once.
 *
 * Two variants, because one composition cannot serve both jobs:
 *
 *   full     the homepage. The tall, three-zone composition from the
 *            reference — brand and guarantee left, large stacked nav icons
 *            centred, search and account right.
 *   compact  everywhere else (country pages, the ~31 footer pages). A single
 *            64px row carrying the same vocabulary at working height. Country
 *            pages hand navigation over to their own sub-nav immediately below,
 *            which is why they cannot afford 160px of chrome.
 *
 * The height of each is a token (`--header-h-full` / `--header-h-compact`), so
 * anything that offsets itself beneath the header reads the same number the
 * header renders at. The country sub-nav used to hardcode 57px against a
 * header that measured 61px, and sat 4px under it.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { FileSearch, Search, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { countriesData, getCountrySlug } from "@/data/countries";

export type HeaderTab = "evisa";

type SiteHeaderProps = {
  /** Layout. `full` is the homepage composition; everything else is compact. */
  variant?: "full" | "compact";
  /** Live-filter wiring, homepage-only. */
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  /** Country pages pin their sub-nav to the top and hide this. */
  forceHide?: boolean;
};

/**
 * THE TAB. Singular, now.
 *
 * There were two — Explore and Events — and Events was a promise the product
 * could not keep: the tab switched to a panel that said events were "on the
 * way" and offered a button back to the grid it had just replaced. A primary
 * navigation slot spent on a coming-soon notice is a slot that teaches people
 * one of the two things up there is not worth pressing.
 *
 * What remains is the thing the company actually sells, named as such: Evisa,
 * not "Explore". "Explore" describes what the page does; "Evisa" names what
 * you get, and it is the word a visitor arrived searching for.
 *
 * ── Why the icon is an emoji rather than a line icon ──
 *
 * The reference draws it as a small colour illustration of a passport, not as
 * a 1.5px stroked glyph. `Compass` was the closest thing in Lucide and it was
 * the wrong noun anyway: this is a visa product, and the object under this tab
 * is a passport.
 *
 * It is U+1F6C2 PASSPORT CONTROL, carried over unchanged from the Explore tab
 * this replaces — which is what was asked for, and is why it is not the navy
 * booklet in `image_video/explore-emoji.png`. That crop is from the REFERENCE
 * SITE, which ships its own illustration; U+1F6C2 renders as a blue sign with
 * a figure on Windows and as a booklet on some other platforms, and neither is
 * within our gift to change.
 *
 * Shipping the crop instead was considered and rejected: it is 61px square,
 * visibly soft at the 30px this renders at on a 2x display, and a second file
 * to ship and cache. A character is drawn by the platform's own colour emoji
 * font at whatever size it is set in, needs no `img-src` grant, and cannot
 * fail to load. If the exact booklet matters more than those three things, the
 * fix is a commissioned SVG rather than a screenshot.
 *
 * `aria-hidden` sits on the wrapper: the label beside it already says "Evisa",
 * and a screen reader announcing "passport control Evisa" reads the same tab
 * twice under two different names.
 */
const TABS: ReadonlyArray<{
  id: HeaderTab;
  label: string;
  glyph: string;
}> = [{ id: "evisa", label: "Evisa", glyph: "\u{1F6C2}" }];

/** Placeholder rotation for the search field — carried over from the old
 *  country-page header, which was the one nice touch it had. */
const PLACEHOLDER_WORDS = ["countries", "cities"];

export function SiteHeader({
  variant = "compact",
  searchQuery,
  onSearchChange,
  forceHide = false,
}: SiteHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [isAtTop, setIsAtTop] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileQuery, setMobileQuery] = useState("");
  /** Off-homepage the field has no parent state to drive it, so it keeps its
   *  own. The input stays controlled either way — flipping between controlled
   *  and uncontrolled on navigation is a React warning waiting to happen. */
  const [localQuery, setLocalQuery] = useState("");
  const lastScrollY = useRef(0);

  const isLiveSearch = isHome && Boolean(onSearchChange);
  const searchValue = isLiveSearch ? (searchQuery ?? "") : localQuery;

  useEffect(() => {
    const id = setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_WORDS.length),
      2500,
    );
    return () => clearInterval(id);
  }, []);

  /**
   * Scroll response, throttled to one frame.
   *
   * The listener used to read `scrollY` and call two setters on every scroll
   * event. React bails out when the value is unchanged, but the read itself is
   * not free: `window.scrollY` forces the browser to flush pending layout, and
   * doing that from a listener that fires many times per frame — which is what
   * a smooth-scroll library driving the page from rAF produces — is a layout
   * thrash on the same thread Lenis is interpolating on. Coalescing to one
   * read per frame is most of the fix; the `if` guards are the rest, because
   * they stop a state update (and a re-render of the whole header, its nav and
   * the search field) from being queued while the values are steady.
   */
  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      setIsAtTop((current) => (current === y < 50 ? current : y < 50));

      // Hide on the way down, return on the way up — unchanged from both of
      // the headers this replaces.
      const next = y < 100 ? true : y <= lastScrollY.current;
      setIsVisible((current) => (current === next ? current : next));

      lastScrollY.current = y;
    };

    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    measure();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Escape closes the mobile search sheet, and the body must not scroll behind
  // it. `data-lenis-prevent` is what stops Lenis from driving the page while
  // the sheet's own list is being scrolled.
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileSearchOpen]);

  const handleSearchChange = (value: string) => {
    // On the homepage the grid filters live off parent state, keystroke by
    // keystroke. Anywhere else there is no grid to filter, so search becomes
    // navigation — and it waits for submit. The header this replaces pushed a
    // route on every keystroke, which navigated away after the first
    // character and made the field impossible to actually type into.
    if (isLiveSearch) onSearchChange!(value);
    else setLocalQuery(value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLiveSearch) return;
    const q = localQuery.trim();
    if (q) router.push(`/?search=${encodeURIComponent(q)}`);
  };

  /**
   * With one tab, "which tab is selected" is no longer state anybody has to
   * hold — it is just whether you are on the destination page. The homepage
   * used to own an `activeTab` and hand it down; that existed only so Explore
   * and Events could disagree, and Events is gone.
   *
   * So the tab is lit when this is the homepage, pressing it there does
   * nothing (you are already looking at it), and pressing it anywhere else is
   * a link home.
   */
  const handleTabClick = () => {
    if (!isHome) router.push("/");
  };

  // The mobile sheet searches the real dataset and its results are links, so
  // the affordance actually goes somewhere. The old overlay rendered four
  // hardcoded emirate names as inert list items.
  const mobileResults = mobileQuery.trim()
    ? countriesData
        .filter((c) => c.name.toLowerCase().includes(mobileQuery.toLowerCase()))
        .slice(0, 8)
    : [];

  const isFull = variant === "full";
  // The tall composition condenses once the page moves. Padding and the nav
  // icon collapse are plain CSS transitions, so the global reduced-motion rule
  // in globals.css flattens them to a snap without any extra handling here.
  const condensed = isFull && !isAtTop;

  return (
    <>
      <header
        data-variant={variant}
        className={[
          "sticky top-0 z-nav border-b transition-[transform,background-color,border-color,box-shadow]",
          "duration-[var(--duration-slow)] ease-[var(--ease-out)]",
          isVisible && !forceHide ? "translate-y-0" : "-translate-y-full",
          isAtTop
            ? "border-transparent bg-transparent"
            : "border-border bg-surface/80 shadow-e1 backdrop-blur-md",
        ].join(" ")}
      >
        {/* Height is fixed from the tokens rather than left to whatever the
            padding adds up to — a min-height plus padding measured 69px against
            a 64px token, which is the same 4px drift that put the sub-nav
            underneath the old header. The 1px subtraction accounts for
            `border-b`, so the token describes the header's *outer* height and
            anything offsetting beneath it can use the number as-is.
            Mobile is always compact; only desktop takes the tall composition,
            and only while the page is at the top. */}
        <div
          className={[
            "mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-6",
            "h-[calc(var(--header-h-compact)-1px)]",
            "transition-[height] duration-[var(--duration-slow)] ease-[var(--ease-out)]",
            isFull && !condensed
              ? "md:h-[calc(var(--header-h-full)-1px)]"
              : "md:h-[calc(var(--header-h-compact)-1px)]",
          ].join(" ")}
        >
          {/* ---------------------------------------------------------------
              Left — wordmark, hairline, guarantee.
              The guarantee is set as two lines of underlined text rather than
              the emerald capsule it used to be. A coloured pill reads as an
              advertisement; this reads as a fact the company is standing
              behind, which is what it is.
              --------------------------------------------------------------- */}
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <Link
              href="/"
              className="flex flex-shrink-0 items-center"
              aria-label="abizon home"
            >
              <BrandLogo size="md" />
            </Link>

            <span
              aria-hidden="true"
              className="hidden h-9 w-px flex-shrink-0 bg-border sm:block"
            />

            {/* The claim, and nothing else.
                It used to be two lines — "Visas On Time / Guaranteed" — behind
                an outlined check in a 28px circle. Both are gone. "Guaranteed"
                was the word doing the promising, and the promise is made
                properly on the pages that can qualify it; a tick beside it was
                a second ornament decorating a claim that no longer needs
                decorating. What is left is one line at the height the wordmark
                sits at, which is also why the `<br>` went with it. */}
            <div className="hidden items-center sm:flex">
              {/* Underline inherits the text colour rather than taking a border
                  tint, which at 12px was too faint to read as an underline. */}
              <p className="text-2xs font-semibold leading-tight text-subtle-foreground underline decoration-1 underline-offset-4">
                Visas On Time
              </p>
            </div>
          </div>

          {/* ---------------------------------------------------------------
              Centre — navigation.
              Desktop stacks a large icon over its label, per the reference.
              Below `md` the tabs move to their own row (see below) so this
              row never has to compete for width on a 320px screen.
              --------------------------------------------------------------- */}
          <nav
            aria-label="Primary"
            className="hidden flex-shrink-0 items-end gap-8 md:flex lg:gap-10"
          >
            {TABS.map(({ id, label, glyph }) => (
              <TabButton
                key={id}
                label={label}
                glyph={glyph}
                active={isHome}
                condensed={condensed || !isFull}
                onClick={handleTabClick}
              />
            ))}
          </nav>

          {/* ---------------------------------------------------------------
              Right — search and account.
              --------------------------------------------------------------- */}
          <div className="flex flex-shrink-0 items-center gap-2 md:gap-3">
            <form
              role="search"
              onSubmit={handleSearchSubmit}
              className="relative hidden md:block"
            >
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="search"
                aria-label="Search countries"
                /* No `placeholder`. The animated one below is the placeholder,
                   and two of them would sit on top of each other. The label is
                   what a screen reader gets, so nothing is lost. */
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={[
                  "h-[var(--control-h-md)] w-56 rounded-full border border-border bg-surface-sunken",
                  "pl-11 pr-4 text-sm text-foreground",
                  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
                  "hover:border-border-strong focus:border-border-strong focus:bg-surface",
                ].join(" ")}
              />

              {/* The rotating placeholder, restored.
                  A real `placeholder` attribute cannot animate — it is painted
                  by the browser, not laid out — so the word rides in its own
                  clipped box on top of the field. `pointer-events-none` keeps
                  the whole control clickable through it, and it disappears the
                  moment there is a value, which is exactly what a placeholder
                  does. Marked `aria-hidden` because `aria-label` above already
                  names the field; announcing a word that changes every 2.5s
                  would be noise. */}
              {searchValue === "" && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-11 top-1/2 flex -translate-y-1/2 items-baseline gap-[0.3em] text-sm text-muted-foreground"
                >
                  Search
                  <span className="relative inline-flex h-[1.125rem] overflow-hidden">
                    {/* Width is reserved by the longest word, laid out
                        invisibly, so the field's contents do not jitter
                        sideways each time the word swaps. */}
                    <span className="invisible">
                      {PLACEHOLDER_WORDS.reduce((a, b) => (b.length > a.length ? b : a))}
                    </span>
                    <AnimatePresence initial={false}>
                      <motion.span
                        key={PLACEHOLDER_WORDS[placeholderIndex]}
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "-100%" }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-x-0 top-0"
                      >
                        {PLACEHOLDER_WORDS[placeholderIndex]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </span>
              )}
            </form>

            {/* Mobile gets the icon; the field itself lives in a sheet. */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Search countries"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-sunken text-subtle-foreground transition-colors hover:bg-surface md:hidden"
            >
              <Search className="h-4.5 w-4.5" aria-hidden="true" />
            </button>

            {/* THE TRACKING CONTROL.

                Beside the account button rather than in the footer or on the
                homepage's own canvas, because the question it answers — "where
                has my application got to" — is asked from whatever page the
                applicant happens to be on, usually days after they left the
                flow. A control that only exists on the homepage is one they
                have to navigate to before they can use it.

                It is an icon and not a labelled link for the same reason the
                account button is: this row already carries a wordmark, a
                claim, a nav tab and a search field, and a fifth piece of text
                would make the search field the only thing in it that is not
                shouting. The accessible name does the naming. */}
            <Link
              href="/track"
              aria-label="Track an application"
              title="Track an application"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-sunken text-subtle-foreground transition-colors hover:border-border-strong hover:bg-surface"
            >
              <FileSearch className="h-5 w-5" aria-hidden="true" />
            </Link>

            <Link
              href="/profile"
              aria-label="Open your profile"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-sunken text-subtle-foreground transition-colors hover:border-border-strong hover:bg-surface"
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* -----------------------------------------------------------------
            Mobile navigation row. Only the full variant carries it: on a
            country page the sub-nav sits directly beneath the header and two
            stacked navigations would be one too many.
            ----------------------------------------------------------------- */}
        {isFull && (
          <nav
            aria-label="Primary"
            className="flex items-end justify-center gap-10 border-t border-border/60 px-4 pb-1 md:hidden"
          >
            {TABS.map(({ id, label, glyph }) => (
              <TabButton
                key={id}
                label={label}
                glyph={glyph}
                active={isHome}
                condensed
                layoutGroup="mobile"
                onClick={handleTabClick}
              />
            ))}
          </nav>
        )}
      </header>

      {/* Mobile search sheet. */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-modal bg-overlay px-4 pt-6 md:hidden"
            onClick={() => setMobileSearchOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search countries"
              data-lenis-prevent
              onClick={(e) => e.stopPropagation()}
              className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-e4"
            >
              <div className="flex items-center gap-2 border-b border-border p-3">
                <Search
                  className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  autoFocus
                  type="search"
                  aria-label="Search countries"
                  placeholder={`Search ${PLACEHOLDER_WORDS[placeholderIndex]}`}
                  value={mobileQuery}
                  onChange={(e) => setMobileQuery(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(false)}
                  aria-label="Close search"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-sunken"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <ul className="max-h-[60vh] overflow-y-auto p-2">
                {mobileResults.map((country) => (
                  <li key={country.id}>
                    <Link
                      href={`/visa/${getCountrySlug(country.name)}`}
                      onClick={() => setMobileSearchOpen(false)}
                      className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-surface-sunken"
                    >
                      <span>{country.name}</span>
                      <span className="text-2xs text-muted-foreground">
                        {country.visaType}
                      </span>
                    </Link>
                  </li>
                ))}

                {mobileQuery.trim() && mobileResults.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No destinations match “{mobileQuery}”.
                  </li>
                )}

                {!mobileQuery.trim() && (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Start typing to find a destination.
                  </li>
                )}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------------- */

function TabButton({
  label,
  glyph,
  active,
  condensed,
  layoutGroup = "desktop",
  onClick,
}: {
  label: string;
  glyph: string;
  active: boolean;
  condensed: boolean;
  layoutGroup?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={[
        "group relative flex cursor-pointer flex-col items-center gap-1.5 pb-2 pt-1",
        "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
        active ? "text-foreground" : "text-muted-foreground hover:text-subtle-foreground",
      ].join(" ")}
    >
      {/* The icon collapses rather than unmounting, so the label never jumps
          sideways as the header condenses — height and opacity only.
          Sized down with the header: a 40px glyph was drawn for a 160px band
          and looks like an illustration in a 112px one. */}
      <span
        aria-hidden="true"
        className={[
          "flex items-center justify-center overflow-hidden",
          "transition-[height,opacity] duration-[var(--duration-slow)] ease-[var(--ease-out)]",
          condensed ? "h-0 opacity-0" : "h-9 opacity-100",
        ].join(" ")}
      >
        {/* `leading-none` on a matched line box, or the emoji's own ascender
            padding pushes the label down and the two tabs stop sharing a
            baseline with the wordmark beside them. Grayscale until active, so
            an unselected tab does not shout in full colour — the same emphasis
            the stroked icons carried, by another means. */}
        <span
          className={[
            "block text-[30px] leading-none",
            "transition-[filter,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
            active
              ? "opacity-100"
              : "opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0",
          ].join(" ")}
        >
          {glyph}
        </span>
      </span>

      <span className="type-ui">{label}</span>

      {active && (
        <motion.span
          layoutId={`header-tab-underline-${layoutGroup}`}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="absolute inset-x-0 bottom-0 mx-auto h-[3px] w-10 rounded-full bg-foreground"
        />
      )}
    </button>
  );
}
