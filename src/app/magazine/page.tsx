import type { Metadata } from "next";
import { BookMarked, Compass, Map, Mountain, Ship, Utensils } from "lucide-react";

import { CTABand, FeatureGrid, PageHero, PageShell, Section } from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Magazine Library | Abizon",
  description:
    "Destination guides, itineraries and travel writing from the Abizon magazine library.",
};

const issues = [
  {
    icon: <Mountain className="h-5 w-5" />,
    title: "The Caucasus, quietly",
    description:
      "Georgia, Armenia and Azerbaijan — three visa-light countries within five hours of Delhi that almost nobody from India visits. Fourteen days, worked out properly.",
    meta: "Issue 12",
  },
  {
    icon: <Ship className="h-5 w-5" />,
    title: "Island-hopping the Philippines",
    description:
      "Palawan to Siargao without the internal flights that eat the budget. Ferry timetables, which islands are worth the crossing, and when the weather turns.",
    meta: "Issue 11",
  },
  {
    icon: <Utensils className="h-5 w-5" />,
    title: "Eating through Vietnam",
    description:
      "Hanoi to Ho Chi Minh City as a food route. What each region actually specialises in, and the dishes that only exist in one city.",
    meta: "Issue 10",
  },
  {
    icon: <Compass className="h-5 w-5" />,
    title: "Central Asia's open door",
    description:
      "Uzbekistan and Kazakhstan have quietly become some of the easiest visas an Indian passport can get. Samarkand, Bukhara and the desert between them.",
    meta: "Issue 9",
  },
  {
    icon: <Map className="h-5 w-5" />,
    title: "The Schengen 90/180 puzzle",
    description:
      "How the rolling 180-day window actually works, why almost everyone miscounts it, and how to plan a long European trip without accidentally overstaying.",
    meta: "Issue 8",
  },
  {
    icon: <BookMarked className="h-5 w-5" />,
    title: "Japan on a budget that exists",
    description:
      "Rail passes worth buying, the ones that are not, and how to see Tokyo, Kyoto and Kanazawa in ten days without the costs people warn you about.",
    meta: "Issue 7",
  },
];

export default function MagazinePage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Magazine Library"
        title="Where to go, once you can"
        description="The visa is the boring part. This is the archive of destination writing we publish alongside it — itineraries built around what a given passport can actually get into, and how long a trip really takes."
      />

      <Section eyebrow="Archive" title="Recent issues">
        <FeatureGrid items={issues} columns={3} />
      </Section>

      <CTABand
        title="Found somewhere?"
        description="Check what it takes to get in — visa type, fee, documents and processing time for 155 destinations."
        href="/tools/visa-requirements"
        label="Check requirements"
      />
    </PageShell>
  );
}
