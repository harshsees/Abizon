"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { ReactNode, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface SmoothScrollProps {
  children: ReactNode;
}

function ScrollTriggerSync() {
  useLenis(() => {
    // Keep GSAP ScrollTrigger in sync with Lenis smooth scroll
    ScrollTrigger.update();
  });

  useEffect(() => {
    // Refresh ScrollTrigger positions after page loading
    ScrollTrigger.refresh();
  }, []);

  return null;
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.05,       // Slower interpolation for ultra-smooth inertial scroll deceleration
        duration: 1.8,    // Longer scroll transition duration for luxurious feel
        smoothWheel: true,
      }}
    >
      <ScrollTriggerSync />
      {children}
    </ReactLenis>
  );
}
