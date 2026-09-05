"use client";

/**
 * ASK AI ABOUT ABIZON
 * ---------------------------------------------------------------------------
 * Four buttons under a heading that said "Ask AI about Abizon" and did not.
 *
 * ── What was there ──
 *
 * `<button type="button">` x4, wearing Lucide's `MessageSquare`, `Sparkles`,
 * `Brain` and `Bot`, with `aria-label`s inventing four products that do not
 * exist ("Abizon AI suggestions", "Abizon AI knowledge base"). None of them had
 * an `onClick`. They were four decorative circles claiming to be a feature, and
 * the accessible names made the claim specific enough to be a lie.
 *
 * ── What they are now ──
 *
 * Real links to the four assistants people actually use, each carrying the
 * question already typed. Press Claude and Claude opens with "Tell me about
 * Abizon…" in the box. That is the whole feature, and it needs no backend:
 * every one of these products takes its opening prompt from the query string.
 *
 * ── The marks are the real ones ──
 *
 * Each path below is the vendor's own logo, taken verbatim from Simple Icons
 * (CC0) — the OpenAI knot, the Claude burst, the Perplexity glyph, the Gemini
 * four-pointed star. They are inlined as paths rather than fetched as images
 * for the same reason the nav glyph is a character: an `<img>` to a vendor CDN
 * is a third-party request on every page load, a `connect-src` grant, a shape
 * that can fail to paint, and a promise that someone else's URL will not move.
 *
 * All four are drawn on a 24-unit viewBox, so they share one `<svg>` shell and
 * differ only in `d` and colour.
 *
 * ── Colour, and why these are not greyscale ──
 *
 * Each mark is set in its vendor's brand colour, which is the thing that makes
 * a 16px logo recognisable at a glance — the Claude burst in Anthropic's clay,
 * the Gemini star in its blue-to-violet gradient. A greyscale row of four would
 * read as four generic icons, which is what the Lucide version was.
 *
 * ── One honest caveat, recorded here rather than discovered later ──
 *
 * ChatGPT, Claude and Perplexity all document (and honour) a prompt in the
 * query string. Gemini does not: `?q=` is what its share links use and it
 * generally lands the text in the composer, but Google has never specified it,
 * so that one is the link most likely to open on an empty box one day. It is
 * still the right destination — the alternative is not offering Gemini — and
 * if it stops prefilling, the fix is a different param here, not a different
 * design.
 */

import { useId } from "react";

/**
 * The question, written once.
 *
 * Long, and deliberately: an assistant given "what is Abizon" answers with
 * whatever it can find, which for a young company is very little and often
 * wrong. Naming the domain, the market and the five things a visitor is
 * actually deciding between gives it the shape of the answer to go and look
 * for. It is also the honest version of the pitch — it asks how we compare,
 * rather than asking for a recommendation.
 */
const INQUIRY = [
  "Tell me about abizon (abizon.com), the online visa service for Indian travellers.",
  "What e-visas do they process, how does their application flow work,",
  "which documents do they ask for, what do they charge,",
  "and how do they compare with other visa services?",
].join(" ");

const q = encodeURIComponent(INQUIRY);

type Assistant = {
  name: string;
  href: string;
  /** Simple Icons path data, 24x24 viewBox. */
  path: string;
  /** The vendor's brand colour, or `null` for the gradient case. */
  colour: string | null;
};

const ASSISTANTS: readonly Assistant[] = [
  {
    name: "ChatGPT",
    href: `https://chatgpt.com/?q=${q}`,
    colour: "#000000",
    path: "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z",
  },
  {
    name: "Claude",
    href: `https://claude.ai/new?q=${q}`,
    // Anthropic's clay. The burst is never drawn in black by the vendor.
    colour: "#D97757",
    path: "m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z",
  },
  {
    name: "Perplexity",
    href: `https://www.perplexity.ai/search?q=${q}`,
    // "True Turquoise", the darker of the two teals in their palette — the
    // lighter one is 2.4:1 on white and disappears at 16px.
    colour: "#20808D",
    path: "M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z",
  },
  {
    name: "Gemini",
    // Undocumented, but this is the param Gemini's own share links use.
    // See the caveat at the top of the file.
    href: `https://gemini.google.com/app?q=${q}`,
    // null = the brand gradient, applied below. Gemini's star is never flat.
    colour: null,
    path: "M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81",
  },
];

export function AskAiLinks() {
  /**
   * The gradient needs an id, and an id in a component that could render twice
   * on a page is a collision — SVG resolves `url(#…)` against the first match
   * in the document, so a second footer would silently paint the first one's
   * gradient. `useId` is the framework's answer and it is stable across
   * hydration, which a counter or a random string would not be.
   */
  const gradientId = `${useId()}-gemini`;

  return (
    <div className="space-y-2.5">
      {/* NOT `uppercase`, unlike the section labels in the columns beside it.
          CSS caps would render this as ASK AI ABOUT ABIZON — the brand spelled
          the one way the rest of the site no longer spells it, and a heading is
          not the place to reintroduce that. It sits in its own column rather
          than in the row of labels, so sentence case here breaks no rhythm. */}
      <h3 className="block text-[11px] font-bold tracking-wider text-muted-foreground">
        Ask AI about abizon
      </h3>

      <ul className="flex items-center gap-2">
        {ASSISTANTS.map(({ name, href, path, colour }) => (
          <li key={name}>
            <a
              href={href}
              target="_blank"
              /* `noreferrer` as well as `noopener`: these are outbound links to
                 four competitors' assistants, and there is no reason to hand
                 any of them the page the visitor came from. */
              rel="noopener noreferrer"
              /* The name says what pressing it does, not what the logo is.
                 "ChatGPT" alone would be a link whose destination a screen
                 reader user has to infer from a heading two elements away. */
              aria-label={`Ask ${name} about abizon — opens in a new tab`}
              title={`Ask ${name} about abizon`}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-sunken transition-[background-color,border-color,transform] duration-[--duration-fast] hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface focus-visible:-translate-y-0.5 motion-reduce:transform-none"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                aria-hidden="true"
                focusable="false"
              >
                {colour === null && (
                  <defs>
                    <linearGradient
                      id={gradientId}
                      x1="0"
                      y1="24"
                      x2="24"
                      y2="0"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0" stopColor="#4285F4" />
                      <stop offset="0.52" stopColor="#9B72CB" />
                      <stop offset="1" stopColor="#D96570" />
                    </linearGradient>
                  </defs>
                )}
                <path d={path} fill={colour ?? `url(#${gradientId})`} />
              </svg>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
