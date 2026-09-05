"use client";

/**
 * Customer reviews.
 *
 * PLACEHOLDER CONTENT. Every review below is written copy, not a real customer
 * submission, and the names attached to them are invented. Nothing here is
 * sourced from a review platform or from Abizon's own records.
 *
 * Phase 4.1 removed the provenance claims that made them read as verified:
 * the Google "G" mark on each card, the "Google Review" footer badge, and the
 * subheading "Real reviews from verified travelers on Google". Attributing
 * invented copy to a named third-party platform is a straightforward false
 * claim about a source, separate from the copy itself being placeholder.
 *
 * DO NOT ADD MORE ENTRIES. When real reviews exist they should arrive from a
 * source with an author, a date and a verifiable origin, and this array should
 * be deleted rather than extended.
 */

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
  <div className="w-[280px] sm:w-[310px] md:w-[340px] shrink-0 rounded-2xl border border-border/70 bg-surface p-4.5 shadow-[0_8px_24px_rgba(15,23,42,0.02)] flex flex-col justify-between select-none">
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9.5 w-9.5 items-center justify-center rounded-full text-white font-bold text-xs ${avatarBg}`}>
            {avatarLetter}
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-tight">{name}</h4>
            <p className="text-[9.5px] text-muted-foreground mt-0.5">{time}</p>
          </div>
        </div>
      </div>

      {/* Stars */}
      <div className="flex gap-0.5 mb-2">
        {[...Array(rating)].map((_, i) => (
          <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      {/* Review text */}
      <p className="text-[11.5px] leading-relaxed text-muted-foreground font-medium line-clamp-3">
        {text}
      </p>
    </div>
  </div>
);

interface ReviewsProps {
  countryName?: string;
}

export function Reviews({ countryName = "Dubai" }: ReviewsProps) {
  // Raw review templates to replace [Country] dynamically (9 unique reviews per row)
  const row1Templates = [
    {
      name: "Aditya Sharma",
      avatarLetter: "A",
      avatarBg: "bg-indigo-500",
      rating: 5,
      time: "2 days ago",
      text: "abizon made my [Country] visa application incredibly simple. I just uploaded my documents, and in 2 days it was approved! Highly recommended."
    },
    {
      name: "Sneha Patel",
      avatarLetter: "S",
      avatarBg: "bg-emerald-500",
      rating: 5,
      time: "1 week ago",
      text: "I was skeptical about the on-time guarantee, but they literally delivered my [Country] visa in 24 hours. The praise is totally deserved!"
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
      text: "Fast, reliable, and completely paperless. Applying for a [Country] visa has never been this easy before. Will use abizon again!"
    },
    {
      name: "Amit Gupta",
      avatarLetter: "A",
      avatarBg: "bg-blue-500",
      rating: 5,
      time: "2 weeks ago",
      text: "abizon service is gold standard. Highly structured, zero confusion. Got my [Country] visa on time as promised."
    },
    {
      name: "Karan Malhotra",
      avatarLetter: "K",
      avatarBg: "bg-teal-500",
      rating: 5,
      time: "4 days ago",
      text: "Incredibly fast service. Got my [Country] visa in less than 48 hours. abizon is brilliant and totally stress-free!"
    },
    {
      name: "Ritu Sen",
      avatarLetter: "R",
      avatarBg: "bg-purple-500",
      rating: 5,
      time: "1 week ago",
      text: "Completely paperless and super simple. I highly recommend abizon for any international travel visa. Exceptional user interface."
    },
    {
      name: "Rajesh Patel",
      avatarLetter: "R",
      avatarBg: "bg-cyan-500",
      rating: 5,
      time: "3 days ago",
      text: "Very transparent tracking. I was updated via WhatsApp and email at every step of my [Country] application process."
    },
    {
      name: "Divya Rao",
      avatarLetter: "D",
      avatarBg: "bg-pink-500",
      rating: 5,
      time: "5 days ago",
      text: "Customer support is top-notch. They helped me correct a passport scanning mistake in minutes. Approved next day!"
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
      text: "I got my visa for [Country] without any flight tickets confirmed beforehand. abizon guided me through the entire process. Top notch."
    },
    {
      name: "Ananya Das",
      avatarLetter: "A",
      avatarBg: "bg-orange-500",
      rating: 5,
      time: "3 days ago",
      text: "Absolutely phenomenal service! Standard delivery promised 4 days, got it in 2. abizon is my go-to visa assistant now."
    },
    {
      name: "Siddharth Mehta",
      avatarLetter: "S",
      avatarBg: "bg-sky-500",
      rating: 5,
      time: "6 days ago",
      text: "abizon fee is worth every rupee. Completely stress-free. My [Country] business visa got approved without any consulate delays."
    },
    {
      name: "Meera Krishnan",
      avatarLetter: "M",
      avatarBg: "bg-fuchsia-500",
      rating: 5,
      time: "1 month ago",
      text: "Their live timelines are so helpful. I could see exactly where my [Country] visa application was at each stage. Very transparent."
    },
    {
      name: "Abhinav Mishra",
      avatarLetter: "A",
      avatarBg: "bg-amber-600",
      rating: 5,
      time: "2 days ago",
      text: "Outstanding experience. The on-time guarantee gave me so much confidence. Got my [Country] visa early without issues."
    },
    {
      name: "Pooja Hegde",
      avatarLetter: "P",
      avatarBg: "bg-emerald-600",
      rating: 5,
      time: "1 week ago",
      text: "Applied for 4 family members at once. The checkout was seamless. Got all [Country] visas on time, perfectly organized."
    },
    {
      name: "Sandeep Reddy",
      avatarLetter: "S",
      avatarBg: "bg-blue-600",
      rating: 5,
      time: "6 days ago",
      text: "The best visa platform. No hidden consulate charges. Completely transparent from start to finish. Highly structured."
    },
    {
      name: "Tanvi Bhatia",
      avatarLetter: "T",
      avatarBg: "bg-rose-600",
      rating: 5,
      time: "3 days ago",
      text: "Smooth experience. Applied for a tourist visa to [Country] and got the approval notice on my email in 3 days. Excellent!"
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
    <section id="reviews" className="w-full py-8 md:py-12 border-t border-border/50 space-y-6 md:space-y-8 scroll-mt-28">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          What our customers say
        </h2>
      </div>

      {/* Scrolling rows container */}
      <div className="w-full overflow-hidden flex flex-col gap-5 py-2 relative after:pointer-events-none before:pointer-events-none before:absolute before:left-0 before:top-0 before:bottom-0 before:w-16 sm:before:w-28 before:bg-gradient-to-r before:from-[#f7f7fa] before:to-transparent before:z-10 after:absolute after:right-0 after:top-0 after:bottom-0 after:w-16 sm:after:w-28 after:bg-gradient-to-l after:from-[#f7f7fa] after:to-transparent after:z-10">
        
        {/* Row 1: Right-to-Left (animate-marquee-left) */}
        <div className="flex w-full marquee-row">
          <div className="flex gap-4.5 animate-marquee-left marquee-track pr-4.5">
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
        <div className="flex w-full marquee-row">
          <div className="flex gap-4.5 animate-marquee-right marquee-track pr-4.5">
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
