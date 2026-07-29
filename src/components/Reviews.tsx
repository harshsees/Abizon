"use client";

import React from "react";

interface ReviewCardProps {
  name: string;
  avatarLetter: string;
  avatarBg: string;
  rating: number;
  time: string;
  text: string;
}

const ReviewCard = ({ name, avatarLetter, avatarBg, rating, time, text }: ReviewCardProps) => (
  <div className="w-[310px] sm:w-[350px] md:w-[380px] shrink-0 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] flex flex-col justify-between select-none">
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white font-bold text-sm ${avatarBg}`}>
            {avatarLetter}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 leading-tight">{name}</h4>
            <p className="text-[10px] text-slate-400 mt-0.5">{time}</p>
          </div>
        </div>
        {/* Google G Logo SVG */}
        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </div>

      {/* Stars */}
      <div className="flex gap-0.5 mb-2.5">
        {[...Array(rating)].map((_, i) => (
          <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      {/* Review text */}
      <p className="text-[12px] leading-relaxed text-slate-500 font-medium line-clamp-3">
        {text}
      </p>
    </div>

    {/* Verification Footer */}
    <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Google Review
    </div>
  </div>
);

interface ReviewsProps {
  countryName?: string;
}

export function Reviews({ countryName = "Dubai" }: ReviewsProps) {
  // Raw review templates to replace [Country] dynamically
  const row1Templates = [
    {
      name: "Aditya Sharma",
      avatarLetter: "A",
      avatarBg: "bg-indigo-500",
      rating: 5,
      time: "2 days ago",
      text: "Keyrise made my [Country] visa application incredibly simple. I just uploaded my documents, and in 2 days it was approved! Highly recommended."
    },
    {
      name: "Sneha Patel",
      avatarLetter: "S",
      avatarBg: "bg-emerald-500",
      rating: 5,
      time: "1 week ago",
      text: "I was skeptical about the on-time guarantee, but they literally delivered my [Country] visa in 24 hours. The Google review theme is totally deserved!"
    },
    {
      name: "Rahul Verma",
      avatarLetter: "R",
      avatarBg: "bg-amber-500",
      rating: 5,
      time: "3 days ago",
      text: "Excellent experience! Very transparent pricing, and the customer support was extremely helpful with my [Country] application queries."
    },
    {
      name: "Priya Nair",
      avatarLetter: "P",
      avatarBg: "bg-rose-500",
      rating: 5,
      time: "5 days ago",
      text: "Fast, reliable, and completely paperless. Applying for a [Country] visa has never been this easy before. Will use Keyrise again!"
    },
    {
      name: "Amit Gupta",
      avatarLetter: "A",
      avatarBg: "bg-blue-500",
      rating: 5,
      time: "2 weeks ago",
      text: "Keyrise service is gold standard. Highly structured, zero confusion. Got my [Country] visa on time as promised."
    }
  ];

  const row2Templates = [
    {
      name: "Neha Singh",
      avatarLetter: "N",
      avatarBg: "bg-violet-500",
      rating: 5,
      time: "4 days ago",
      text: "Very clean UI and super quick processing. They managed my [Country] tourist visa within 3 days. Total peace of mind!"
    },
    {
      name: "Vikram Rao",
      avatarLetter: "V",
      avatarBg: "bg-teal-500",
      rating: 5,
      time: "1 week ago",
      text: "I got my visa for [Country] without any flight tickets confirmed beforehand. Keyrise guided me through the entire process. Top notch."
    },
    {
      name: "Ananya Das",
      avatarLetter: "A",
      avatarBg: "bg-orange-500",
      rating: 5,
      time: "3 days ago",
      text: "Absolutely phenomenal service! Standard delivery promised 4 days, got it in 2. Keyrise is my go-to visa assistant now."
    },
    {
      name: "Siddharth Mehta",
      avatarLetter: "S",
      avatarBg: "bg-sky-500",
      rating: 5,
      time: "6 days ago",
      text: "Keyrise fee is worth every rupee. Completely stress-free. My [Country] business visa got approved without any consulate delays."
    },
    {
      name: "Meera Krishnan",
      avatarLetter: "M",
      avatarBg: "bg-fuchsia-500",
      rating: 5,
      time: "1 month ago",
      text: "Their live timelines are so helpful. I could see exactly where my [Country] visa application was at each stage. Very transparent."
    }
  ];

  // Perform country name formatting
  const formatReviews = (list: typeof row1Templates) =>
    list.map((review) => ({
      ...review,
      text: review.text.replace(/\[Country\]/g, countryName)
    }));

  const row1 = formatReviews(row1Templates);
  const row2 = formatReviews(row2Templates);

  return (
    <section id="reviews" className="w-full py-8 md:py-12 border-t border-slate-200/50 space-y-6 md:space-y-8 scroll-mt-28">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--foreground)] tracking-tight">
          What our customers say
        </h2>
        <p className="text-xs md:text-sm text-[var(--muted)] mt-1.5">
          Real reviews from verified travelers on Google
        </p>
      </div>

      {/* Scrolling rows container */}
      <div className="w-full overflow-hidden flex flex-col gap-5 py-2 relative after:pointer-events-none before:pointer-events-none before:absolute before:left-0 before:top-0 before:bottom-0 before:w-16 sm:before:w-28 before:bg-gradient-to-r before:from-[#f7f7fa] before:to-transparent before:z-10 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-16 sm:after:w-28 after:bg-gradient-to-l after:from-[#f7f7fa] after:to-transparent after:z-10">
        
        {/* Row 1: Right-to-Left (animate-marquee-left) */}
        <div className="flex w-full group/row1">
          <div className="flex gap-5 animate-marquee-left hover:[animation-play-state:paused] pr-5">
            {/* Original Items */}
            {row1.map((review, i) => (
              <ReviewCard key={`r1-orig-${i}`} {...review} />
            ))}
            {/* Duplicated Items for seamless infinite wrap */}
            {row1.map((review, i) => (
              <ReviewCard key={`r1-dup-${i}`} {...review} />
            ))}
          </div>
        </div>

        {/* Row 2: Left-to-Right (animate-marquee-right) */}
        <div className="flex w-full group/row2">
          <div className="flex gap-5 animate-marquee-right hover:[animation-play-state:paused] pr-5">
            {/* Original Items */}
            {row2.map((review, i) => (
              <ReviewCard key={`r2-orig-${i}`} {...review} />
            ))}
            {/* Duplicated Items for seamless infinite wrap */}
            {row2.map((review, i) => (
              <ReviewCard key={`r2-dup-${i}`} {...review} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
