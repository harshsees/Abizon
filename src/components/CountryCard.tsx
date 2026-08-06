"use client";

import { motion } from "framer-motion";
import { Country } from "@/data/countries";

interface CountryCardProps {
  country: Country;
  onClick?: (countryName: string) => void;
}

export function CountryCard({ country, onClick }: CountryCardProps) {
  // Format the guaranteed visa date based on deliveryDays
  const getGuaranteedDateString = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const dateStr = date.toLocaleDateString("en-US", options); // e.g. "Jul 29" or "29 Jul"
    
    // Add suffix to day (e.g. 29th, 1st, 2nd, 3rd)
    const day = date.getDate();
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";
    
    // Format: "29th Jul"
    const month = date.toLocaleDateString("en-US", { month: "short" });
    return `${day}${suffix} ${month}`;
  };

  const guaranteedDate = getGuaranteedDateString(country.deliveryDays);

  return (
    <div 
      className="flex flex-col gap-3 group cursor-pointer w-full select-none"
      onClick={() => onClick?.(country.name)}
    >
      {/* Outer Card Container */}
      <motion.div
        whileHover={{ y: -8, scale: 1.03, rotate: 1.5 }}
        transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
        className="relative aspect-[3/4.4] w-full overflow-hidden rounded-[32px] bg-slate-900 shadow-lg border border-slate-200/10 hover:shadow-[0_30px_60px_-15px_rgba(15,23,42,0.35)] transition-shadow duration-500"
      >
        {/* Country Landscape Background Image */}
        <img
          src={country.imageUrl}
          alt={`${country.name} scenery`}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />

        {/* Ambient Dark Gradient Overlays (Top and Bottom) */}
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none" />

        {/* Floating elements container */}
        <div className="absolute inset-0 flex flex-col justify-end p-3">
          
          {/* Circular Flag Icon */}
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/60 bg-white/20 shadow-md backdrop-blur-sm overflow-hidden transition-transform duration-500 group-hover:scale-112">
            <img
              src={`https://flagcdn.com/w80/${country.code}.png`}
              alt={`${country.name} flag`}
              className="h-full w-full object-cover scale-110"
              loading="lazy"
            />
          </div>

          {/* Uppercase Country Name */}
          <h3 className="mb-4 text-center font-serif text-lg font-bold tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] px-2 leading-tight uppercase font-sans transition-transform duration-500 group-hover:scale-103">
            {country.name}
          </h3>

          {/* Details Drawer (Glassmorphic Box) */}
          <div className="w-full rounded-2xl border border-white/12 bg-black/35 p-3 backdrop-blur-lg transition-transform duration-500 group-hover:translate-y-[-2px] group-hover:bg-black/45">
            <div className="grid grid-cols-3 gap-1 divide-x divide-white/10 text-center">
              {/* Type Column */}
              <div className="flex flex-col items-center justify-center px-1">
                <span className="text-[9px] font-bold tracking-wider text-slate-300/80 uppercase">
                  Type
                </span>
                <span className="mt-0.5 text-[11px] md:text-[12px] font-extrabold text-white uppercase whitespace-nowrap">
                  {country.visaType}
                </span>
              </div>

              {/* Validity Column */}
              <div className="flex flex-col items-center justify-center px-1">
                <span className="text-[9px] font-bold tracking-wider text-slate-300/80 uppercase">
                  Valid
                </span>
                <span className="mt-0.5 text-[11px] md:text-[12px] font-extrabold text-white uppercase whitespace-nowrap">
                  {country.validity}
                </span>
              </div>

              {/* Fees Column */}
              <div className="flex flex-col items-center justify-center px-1">
                <span className="text-[9px] font-bold tracking-wider text-slate-300/80 uppercase">
                  {country.fees.toLowerCase() === "free" ? "Cost" : "Fees"}
                </span>
                <span className="mt-0.5 text-[11px] md:text-[12px] font-extrabold text-white uppercase whitespace-nowrap">
                  {country.fees}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Guaranteed Visa Text below the card */}
      <span className="text-center text-xs font-medium text-muted-foreground group-hover:text-slate-700 transition-colors duration-200">
        Guaranteed Visa on <span className="font-semibold text-slate-700">{guaranteedDate}</span>
      </span>
    </div>
  );
}
