import type { Metadata } from "next";

import { CTABand, Callout, PageHero, PageShell, Section, StepList } from "@/components/PageKit";
import { PhotoSpecTool } from "@/components/tools/PhotoSpecTool";

export const metadata: Metadata = {
  title: "Visa Photo Creator — Size & Specification Checker | Keyrise",
  description:
    "Exact visa photo dimensions, head height and background rules for Schengen, US, UK, Japan, India and UAE applications.",
};

const steps = [
  {
    title: "Stand facing a plain wall in even light",
    description:
      "Daylight from a window in front of you, not behind. Overhead lighting is the single most common cause of the shadow that gets a photo rejected.",
  },
  {
    title: "Have someone take it from 1.5 metres away",
    description:
      "Arm's-length selfies distort facial proportions enough that automated checks flag them. Distance matters more than camera quality.",
  },
  {
    title: "Neutral expression, eyes open, mouth closed",
    description:
      "No smile. Remove glasses entirely — most countries now reject them outright rather than assessing glare case by case.",
  },
  {
    title: "Upload it and let the checker crop",
    description:
      "Our validator sizes it to the destination's specification, verifies head height and flags anything that would fail. You never crop it yourself.",
  },
];

export default function VisaPhotoCreatorPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Visa Photo Creator"
        title="A photo that won't get rejected"
        description="Photo non-compliance is one of the most common reasons a straightforward application comes back. The specifications differ by country in ways that are easy to miss — here they are, drawn to scale."
      />

      <Section>
        <PhotoSpecTool />
      </Section>

      <Section muted eyebrow="Taking it" title="Four steps, using a phone">
        <div className="max-w-2xl">
          <StepList steps={steps} />
        </div>

        <div className="mt-10 max-w-2xl">
          <Callout tone="warning" title="Don't reuse an old photo">
            Almost every country requires a photo taken within the last six months — the UAE
            asks for three. Reusing the photo from your last application is the quickest way
            to have a fresh one refused, and consulates do compare against what they hold.
          </Callout>
        </div>
      </Section>

      <CTABand
        title="Apply with the photo already checked"
        description="Every application through Keyrise runs the photo against the destination's specification before it's submitted."
        href="/"
        label="Start an application"
      />
    </PageShell>
  );
}
