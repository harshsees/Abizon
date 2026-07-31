"use client";

import React from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

type TopHeroProps = {
  onStart?: () => void;
  countryName?: string;
  deliveryDays?: number;
  imageUrl?: string;
};

const heroVideoSrc = "/video/dubai-hero.mp4";

export const TopHero = React.forwardRef<HTMLElement, TopHeroProps>(
  function TopHero({ onStart, countryName = "Dubai (UAE)", deliveryDays = 4, imageUrl }, ref) {
    return (
      <section ref={ref} className="mx-auto w-full max-w-[1200px] px-4 pt-4 md:px-6 md:pt-6">
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[#111827] shadow-[0_25px_70px_rgba(17,24,39,0.18)]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.22),rgba(2,6,23,0.5)),radial-gradient(circle_at_top,rgba(255,255,255,0.09),transparent_35%)]" />
          <div className="relative min-h-[540px] px-5 py-10 md:min-h-[620px] md:px-10 md:py-12">
            
            {imageUrl ? (
              <img
                className="hero-media absolute inset-0 h-full w-full object-cover opacity-50 brightness-90 saturate-90 contrast-95"
                src={imageUrl}
                alt={countryName}
              />
            ) : (
              <video
                className="hero-media absolute inset-0 h-full w-full object-cover opacity-60 brightness-95 saturate-90 contrast-95"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              >
                <source src={heroVideoSrc} type="video/mp4" />
              </video>
            )}

            <div className="absolute inset-0 flex items-center justify-center px-5">
              <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center text-white">
                <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl js-reveal-heading">
                  {countryName} Visa for Indians
                </h1>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/12 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur">
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                    Visa guaranteed in {deliveryDays} {deliveryDays === 1 ? "day" : "days"}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  {onStart ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onStart();
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] border border-white/15 px-8 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] cursor-pointer js-magnetic-btn"
                    >
                      Start Application
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <a
                      href="#application-flow"
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] border border-white/15 px-8 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] cursor-pointer js-magnetic-btn"
                    >
                      Start Application
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
);
