"use client";

/**
 * THE PRINTER, AS A SOUND.
 * ---------------------------------------------------------------------------
 * Ported from the reference the product owner supplied (`reciept-ui/`), whose
 * `script.js` arrived inside the PDF in that folder. Its header calls this
 * "100% Synced Audio", and that is the whole design: the motor noise is
 * generated for EXACTLY the duration of the paper's motion and stops on the
 * frame the paper stops, rather than being a clip that happens to be about the
 * right length. A printer sound that outlives the print is worse than none.
 *
 * SYNTHESISED, NOT SAMPLED. Four reasons, in the order they matter:
 *
 *   1. There is no audio file to ship, cache, or add to `media-src`.
 *   2. The duration is a parameter rather than a property of a recording, so
 *      changing the feed animation cannot desynchronise the sound.
 *   3. A thermal printer IS filtered noise plus stepper clicks. This is not an
 *      approximation of the real thing; it is how the real thing sounds.
 *   4. It fails silently and completely. Every call is wrapped, and a browser
 *      that blocks the `AudioContext` loses the sound and nothing else.
 *
 * NOTHING HERE OPENS A CONTEXT SPECULATIVELY. `PrinterAudio` is constructed
 * lazily on the first sound actually requested, and the caller gates every call
 * on a preference with a mute on screen beside it. The first sound follows the
 * applicant pressing Pay, whose user activation is what lets the context start
 * rather than being created suspended. See `ReceiptPrinter`.
 */

/** The reference's two voices: a heavier stepper and a quieter continuous feed. */
export type PrinterMode = "classic" | "smooth";

type Ctor = typeof AudioContext;

export class PrinterAudio {
  private context: AudioContext | null = null;

  /**
   * Opened on demand and kept.
   *
   * `resume()` on every call, not just the first: a context created during a
   * press is running, but the browser suspends it again when the tab is
   * backgrounded, and the next press would otherwise schedule notes into a
   * clock that is not moving.
   */
  private open(): AudioContext | null {
    try {
      if (!this.context) {
        const Ctor: Ctor | undefined =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
        if (!Ctor) return null;
        this.context = new Ctor();
      }
      if (this.context.state === "suspended") void this.context.resume();
      return this.context;
    } catch {
      return null;
    }
  }

  /** White noise, `seconds` long, at the context's own sample rate. */
  private noise(context: AudioContext, seconds: number): AudioBuffer {
    const frames = Math.max(1, Math.floor(context.sampleRate * seconds));
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) channel[i] = Math.random() * 2 - 1;
    return buffer;
  }

  /**
   * The motor, for exactly `durationMs`.
   *
   * Bandpassed noise is the hum: 850Hz with a stepper's harder mechanism,
   * 600Hz for the smooth feed, Q 3.5 either way so it reads as a resonant
   * cavity rather than as static. The envelope attacks over 80ms, holds, and
   * ramps to zero across the final 120ms so the sound lands on the paper's
   * last frame instead of being cut off at it.
   *
   * Classic adds 14 stepper pulses — square oscillators between 210 and 270Hz,
   * 20ms each — spaced evenly across the motion. That is the count and the
   * spacing from the reference, and it is what makes Classic sound like it is
   * pulling the sheet through in steps.
   */
  motor(mode: PrinterMode, durationMs: number): void {
    const context = this.open();
    if (!context) return;

    try {
      const now = context.currentTime;
      const duration = durationMs / 1000;

      const source = context.createBufferSource();
      source.buffer = this.noise(context, duration);

      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(mode === "classic" ? 850 : 600, now);
      filter.Q.setValueAtTime(3.5, now);

      const gain = context.createGain();
      const peak = mode === "classic" ? 0.07 : 0.04;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(peak, now + 0.08);
      gain.gain.setValueAtTime(peak, now + duration - 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start(now);
      source.stop(now + duration);

      if (mode !== "classic") return;

      const steps = 14;
      const interval = (duration - 0.1) / steps;
      for (let i = 0; i < steps; i += 1) {
        const at = now + i * interval;
        const osc = context.createOscillator();
        const stepGain = context.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(210 + Math.random() * 60, at);
        stepGain.gain.setValueAtTime(0.05, at);
        stepGain.gain.exponentialRampToValueAtTime(0.001, at + 0.02);
        osc.connect(stepGain);
        stepGain.connect(context.destination);
        osc.start(at);
        osc.stop(at + 0.02);
      }
    } catch {
      // Audio is a garnish. A blocked context must never stop the animation.
    }
  }

  /**
   * The cutter.
   *
   * A 350ms noise burst with an exponential decay baked into the buffer itself
   * rather than into the gain — that is what gives it the sharp front edge of
   * a blade rather than the swell of a fade-in — highpassed at 1400Hz so it
   * reads as a tear rather than as a thud.
   */
  tear(): void {
    const context = this.open();
    if (!context) return;

    try {
      const now = context.currentTime;
      const duration = 0.35;

      const frames = Math.floor(context.sampleRate * duration);
      const buffer = context.createBuffer(1, frames, context.sampleRate);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < frames; i += 1) {
        channel[i] =
          (Math.random() * 2 - 1) * Math.exp(-i / (context.sampleRate * 0.06));
      }

      const source = context.createBufferSource();
      source.buffer = buffer;

      const filter = context.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1400, now);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start(now);
      source.stop(now + duration);
    } catch {
      // As above.
    }
  }

  /** Releases the hardware. The camera light analogue: nothing stays open. */
  close(): void {
    try {
      void this.context?.close();
    } catch {
      // A context already closed by the browser throws. Nothing to do.
    }
    this.context = null;
  }
}
