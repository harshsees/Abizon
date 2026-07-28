"use client";

import { Search, X, User } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const destinations = ["Dubai", "Abu Dhabi", "Sharjah", "Ras Al Khaimah"];

type HeaderProps = {
  onStart?: () => void;
  forceHide?: boolean;
};

export function Header({ onStart, forceHide = false }: HeaderProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const placeholderWords = ["countries", "cities"];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const threshold = 500;

      if (currentScrollY > threshold) {
        if (currentScrollY > lastScrollY) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const filtered = useMemo(
    () =>
      destinations.filter((item) =>
        item.toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );

  return (
    <>
      <header className={`sticky top-0 z-50 bg-white/90 backdrop-blur transition-transform duration-350 ease-in-out ${
        (isVisible && !forceHide) ? "translate-y-0" : "-translate-y-full"
      }`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-white">
              VC
            </div>
            <span className="text-sm font-semibold text-[var(--foreground)]">
              Keyrise
            </span>
          </a>

          {/* Search Pill & Login */}
          <div className="flex items-center gap-4">
            {/* Search Pill */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="relative flex items-center justify-between w-48 sm:w-56 md:w-64 rounded-full border border-slate-200 bg-slate-50/40 py-2 px-4 text-left text-sm text-[var(--muted)] hover:bg-[#f8f8fc] hover:border-slate-300 transition duration-200 cursor-pointer"
            >
              <div className="flex items-center text-slate-400">
                <span>Search </span>
                <div className="relative h-5 overflow-hidden w-20 ml-1 flex items-center">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIndex}
                      initial={{ y: 15, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -15, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="absolute left-0 text-slate-400 font-medium"
                    >
                      {placeholderWords[placeholderIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
              <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </button>

            {/* Profile Avatar Button (Matches 2nd Screenshot themed style) */}
            <button 
              onClick={() => router.push("/profile")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--primary)] bg-[var(--primary)]/8 text-[var(--primary)] hover:bg-[var(--primary)]/15 transition-all shadow-sm cursor-pointer flex-shrink-0"
            >
              <User className="w-5 h-5 text-[var(--primary)]" />
            </button>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 px-4 pt-20">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                Search destinations
              </h3>
              <button type="button" onClick={() => setSearchOpen(false)}>
                <X className="h-5 w-5 text-[var(--muted)]" />
              </button>
            </div>
            <input
              aria-label="Search destination"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Dubai, Abu Dhabi..."
              className="mb-3 w-full rounded-xl border border-[var(--border)] px-4 py-3 text-sm"
              autoFocus
            />
            <ul className="space-y-2">
              {filtered.length ? (
                filtered.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)]"
                  >
                    {item}
                  </li>
                ))
              ) : (
                <li className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  No destinations found.
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
