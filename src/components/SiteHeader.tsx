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
import { Check, Compass, Search, Ticket, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { countriesData, getCountrySlug } from "@/data/countries";

export type HeaderTab = "explore" | "events";

type SiteHeaderProps = {
  /** Layout. `full` is the homepage composition; everything else is compact. */
  variant?: "full" | "compact";
  /**
   * Only the homepage passes these. Elsewhere the tabs are pure navigation:
   * neither is active, and clicking one routes home with the tab selected.
   */
  activeTab?: HeaderTab;
  onTabChange?: (tab: HeaderTab) => void;
  /** Live-filter wiring, again homepage-only. */
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  /** Country pages pin their sub-nav to the top and hide this. */
  forceHide?: boolean;
};

const TABS: ReadonlyArray<{
  id: HeaderTab;
  label: string;
  Icon: typeof Compass;
}> = [
  { id: "explore", label: "Explore", Icon: Compass },
  { id: "events", label: "Events", Icon: Ticket },
];

/** Placeholder rotation for the search field — carried over from the old
 *  country-page header, which was the one nice touch it had. */
const PLACEHOLDER_WORDS = ["countries", "cities"];

export function SiteHeader({
  variant = "compact",
  activeTab,
  onTabChange,
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

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setIsAtTop(y < 50);

      // Hide on the way down, return on the way up — unchanged from both of
      // the headers this replaces.
      if (y < 100) setIsVisible(true);
      else if (y > lastScrollY.current) setIsVisible(false);
      else setIsVisible(true);

      lastScrollY.current = y;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
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

  const handleTabClick = (tab: HeaderTab) => {
    if (isHome && onTabChange) onTabChange(tab);
    else router.push(`/?tab=${tab}`);
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
              className="flex flex-shrink-0 items-center gap-2"
              aria-label="Abizon home"
            >
              <svg
                className="h-7 w-7 text-foreground md:h-8 md:w-8"
                viewBox="0 0 100 100"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M15 80 L50 20 L85 80 Z"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M40 55 L60 55"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M50 20 L55 35"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-xl font-black tracking-tighter text-foreground">
                abizon
              </span>
            </Link>

            <span
              aria-hidden="true"
              className="hidden h-9 w-px flex-shrink-0 bg-border sm:block"
            />

            <div className="hidden items-center gap-2 sm:flex">
              {/* A single outlined check, as in the reference. It is the only
                  ornament the guarantee gets — the claim carries itself. */}
              <span
                aria-hidden="true"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border-strong text-subtle-foreground"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              {/* Underline inherits the text colour rather than taking a border
                  tint, which at 12px was too faint to read as an underline. */}
              <p className="text-2xs font-semibold leading-tight text-subtle-foreground underline decoration-1 underline-offset-4">
                Visas On Time
                <br />
                Guaranteed
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
            {TABS.map(({ id, label, Icon }) => (
              <TabButton
                key={id}
                label={label}
                Icon={Icon}
                active={activeTab === id}
                condensed={condensed || !isFull}
                onClick={() => handleTabClick(id)}
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
            {TABS.map(({ id, label, Icon }) => (
              <TabButton
                key={id}
                label={label}
                Icon={Icon}
                active={activeTab === id}
                condensed
                layoutGroup="mobile"
                onClick={() => handleTabClick(id)}
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
  Icon,
  active,
  condensed,
  layoutGroup = "desktop",
  onClick,
}: {
  label: string;
  Icon: typeof Compass;
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
        <Icon className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" />
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
