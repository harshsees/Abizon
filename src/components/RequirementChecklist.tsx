import { CheckCircle2, IdCard, Image as ImageIcon, Mail, Plane } from "lucide-react";

const requirements = [
  {
    title: "Valid Indian Passport",
    desc: "Passport validity should be at least 6 months from travel date.",
    icon: IdCard,
  },
  {
    title: "Clear Passport Scan",
    desc: "Upload front page in JPG, PNG, or PDF format.",
    icon: CheckCircle2,
  },
  {
    title: "Recent Photograph",
    desc: "White background photo taken in the last 6 months.",
    icon: ImageIcon,
  },
  {
    title: "Confirmed Travel Dates",
    desc: "Add planned entry and return date before checkout.",
    icon: Plane,
  },
  {
    title: "Valid Email and Phone",
    desc: "Used for OTP verification and application status updates.",
    icon: Mail,
  },
];

export function RequirementChecklist({ className }: { className?: string }) {
  return (
    <section id="requirements" className={`${className || "mx-auto w-full max-w-7xl px-4 py-14 md:px-6"} scroll-mt-20`}>
      <h2 className="text-3xl font-bold text-foreground">
        Visa requirements
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Keep these details ready for faster application processing.
      </p>
      <div className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
        {requirements.map(({ title, desc, icon: Icon }) => (
          <div
            key={title}
            className="group flex gap-4.5 p-2 rounded-2xl transition duration-300 hover:bg-slate-50/60"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-primary transition-transform duration-300 group-hover:scale-110">
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight transition-colors duration-200 group-hover:text-primary">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
