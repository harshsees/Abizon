"use client";

/**
 * "All 7 Emirates with 1 Visa" — UAE-only supplementary content.
 *
 * It was already gated on the country name inside `VisaInfoAndPlans`; moving it
 * here makes the country-specific nature structural rather than a conditional
 * buried 400 lines into a shared component. The page decides whether to render
 * it, from `CountryVisaConfig.additionalSections`.
 */

export function EmiratesCoverage() {
  return (
        <div className="pt-8 border-t border-border/50">
          <div className="space-y-6">
          <div>
            <h2 id="emirates-section" className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28">
              All 7 Emirates with 1 Visa
            </h2>
          </div>

          <div className="space-y-3.5 md:space-y-4">
            {/* Top Row: Dubai, Abu Dhabi, Sharjah */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              {[
                {
                  name: "Dubai",
                  image: "/images/emirates/dubai.jpg",
                },
                {
                  name: "Abu Dhabi",
                  image: "/images/emirates/abu-dhabi.png",
                },
                {
                  name: "Sharjah",
                  image: "/images/emirates/sharjah.png",
                },
              ].map((emirate) => (
                <div
                  key={emirate.name}
                  className="relative group overflow-hidden rounded-[20px] shadow-sm cursor-pointer h-[180px] sm:h-[240px] md:h-[260px] bg-surface-sunken"
                >
                  <img
                    src={emirate.image}
                    alt={emirate.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white font-bold text-base sm:text-xl md:text-2xl tracking-tight leading-tight">
                      {emirate.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Row: Ras Al Khaimah, Fujairah, Umm Al Quwain, Ajman */}
            <div className="grid grid-cols-4 gap-2.5 md:gap-3">
              {[
                {
                  name: "Ras Al Khaimah",
                  image: "/images/emirates/ras-al-khaimah.jpg",
                },
                {
                  name: "Fujairah",
                  image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&h=400&q=80",
                },
                {
                  name: "Umm Al Quwain",
                  image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&h=400&q=80",
                },
                {
                  name: "Ajman",
                  image: "/images/emirates/ajman.png",
                },
              ].map((emirate) => (
                <div
                  key={emirate.name}
                  className="relative group overflow-hidden rounded-[16px] sm:rounded-[20px] shadow-sm cursor-pointer h-[160px] sm:h-[225px] md:h-[250px] bg-surface-sunken"
                >
                  <img
                    src={emirate.image}
                    alt={emirate.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4">
                    <p className="text-white font-bold text-xs sm:text-base md:text-lg tracking-tight leading-tight break-words">
                      {emirate.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
  );
}
