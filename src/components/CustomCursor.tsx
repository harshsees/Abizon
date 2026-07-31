"use client";

import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Hide custom cursor on mobile / tablets
    if (window.innerWidth < 768) return;

    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    // Initialize visibility
    gsap.set([cursor, ring], { opacity: 0 });

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
          borderColor: "var(--primary, #d97706)",
          backgroundColor: "rgba(217, 119, 6, 0.08)",
          borderWidth: "1.5px",
          duration: 0.25,
          overwrite: "auto"
        });
        gsap.to(cursor, {
          scale: 0.5,
          backgroundColor: "var(--primary, #d97706)",
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
          borderColor: "rgba(15, 23, 42, 0.25)",
          backgroundColor: "transparent",
          borderWidth: "1px",
          mixBlendMode: "normal",
          duration: 0.25,
          overwrite: "auto"
        });
        gsap.to(cursor, {
          scale: 1,
          backgroundColor: "rgb(15, 23, 42)",
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
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-2 w-2 rounded-full bg-slate-900 opacity-0 transition-opacity duration-300 md:block hidden"
      />
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[9998] h-8 w-8 rounded-full border border-slate-900/20 opacity-0 transition-opacity duration-300 md:block hidden"
      />
    </>
  );
}
