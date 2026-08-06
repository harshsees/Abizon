"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Must match the media query guarding `cursor: none` in globals.css, or we
    // hide the real pointer on devices that never get a custom one.
    if (!window.matchMedia("(min-width: 768px) and (pointer: fine)").matches) return;

    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    // Only now is it safe to hide the system cursor: the replacement exists.
    // If this effect never runs — JS fails, hydration stalls, coarse pointer —
    // the class is absent and the real cursor stays visible.
    document.documentElement.classList.add("has-custom-cursor");

    // Initialize visibility
    gsap.set([cursor, ring], { opacity: 0 });

    // Resolve tokens to concrete colours once. GSAP can set a `var(...)` string
    // but cannot interpolate between two of them, so the hover tweens would
    // snap rather than ease if we passed the custom properties through.
    const token = (name: string, fallback: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

    const primary = token("--color-primary", "#d97706");
    const foreground = token("--color-foreground", "#0f172a");

    // Tokens are 6-digit hex; fall back to the raw value if one ever isn't.
    const alpha = (color: string, a: number) => {
      const hex = /^#([0-9a-f]{6})$/i.exec(color);
      if (!hex) return color;
      const n = Number.parseInt(hex[1], 16);
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    };

    // GSAP quickTo properties for maximum 60FPS fluid pointer tracking
    const xToCursor = gsap.quickTo(cursor, "x", { duration: 0.08, ease: "power3" });
    const yToCursor = gsap.quickTo(cursor, "y", { duration: 0.08, ease: "power3" });

    const xToRing = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3.out" });
    const yToRing = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3.out" });

    const handleMouseMove = (e: MouseEvent) => {
      // Offset position relative to client dimensions (center centering)
      xToCursor(e.clientX - 4);
      yToCursor(e.clientY - 4);
      xToRing(e.clientX - 16);
      yToRing(e.clientY - 16);
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Hover state management using event delegation
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const isHoverable = 
        target.closest("button") || 
        target.closest("a") || 
        target.closest("input") || 
        target.closest(".js-hover-trigger") || 
        target.closest("[role='button']");

      const isImage = 
        target.closest("img") || 
        target.closest("video") || 
        target.closest(".js-hover-image");

      if (isHoverable) {
        // Enlarge ring and highlight with amber theme accent color
        gsap.to(ring, {
          scale: 1.5,
          borderColor: primary,
          backgroundColor: alpha(primary, 0.08),
          borderWidth: "1.5px",
          duration: 0.25,
          overwrite: "auto"
        });
        gsap.to(cursor, {
          scale: 0.5,
          backgroundColor: primary,
          duration: 0.25,
          overwrite: "auto"
        });
      } else if (isImage) {
        // Image overlay difference mode
        gsap.to(ring, {
          scale: 2.2,
          borderColor: "#ffffff",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          borderWidth: "1px",
          mixBlendMode: "difference",
          duration: 0.25,
          overwrite: "auto"
        });
        gsap.to(cursor, {
          scale: 2.5,
          backgroundColor: "#ffffff",
          mixBlendMode: "difference",
          duration: 0.25,
          overwrite: "auto"
        });
      } else {
        // Standard normal state
        gsap.to(ring, {
          scale: 1,
          borderColor: alpha(foreground, 0.25),
          backgroundColor: "transparent",
          borderWidth: "1px",
          mixBlendMode: "normal",
          duration: 0.25,
          overwrite: "auto"
        });
        gsap.to(cursor, {
          scale: 1,
          backgroundColor: foreground,
          mixBlendMode: "normal",
          duration: 0.25,
          overwrite: "auto"
        });
      }
    };

    window.addEventListener("mouseover", handleMouseOver);

    // Visibility togglers
    const handleMouseLeave = () => {
      gsap.to([cursor, ring], { opacity: 0, duration: 0.3 });
    };
    const handleMouseEnter = () => {
      gsap.to([cursor, ring], { opacity: 1, duration: 0.3 });
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, []);

  return (
    <>
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] hidden h-2 w-2 rounded-full bg-foreground opacity-0 transition-opacity duration-300 md:block"
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[99] hidden h-8 w-8 rounded-full border border-foreground/20 opacity-0 transition-opacity duration-300 md:block"
      />
    </>
  );
}
