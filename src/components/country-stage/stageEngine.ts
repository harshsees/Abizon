/**
 * THE STAGE ENGINE — Mirror Hall's ring of cards and Ascend's planet in one
 * WebGL canvas, driven by one clock so they cannot drift apart.
 *
 * Two scenes, two cameras, one composer. The planet's camera is lens-shifted
 * so the sphere sits sunk into the bottom of the frame; the hall's camera
 * stands inside the ring and is lens-shifted so the waterline lands where the
 * layout wants it. The hall draws over the planet with a cleared depth buffer,
 * then the output pass runs over both.
 *
 * There is no bloom. The stage is set in daylight now, and bloom over a pale
 * sky lifts the whole frame toward white instead of making anything glow.
 *
 * Sync is a single number: `pos`, the ring's position in card units. The card
 * nearest the front is the active destination; the planet springs toward
 * whatever that is — continuously, so dragging through the hall swings the
 * globe live — and when it changes, the pin drops onto the new country.
 */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { paintCard, loadImage, waitForFonts, TEX_W, TEX_H, type CardFace } from "./cardTexture";
import { createEarth, latLngToVec, type Earth } from "./earth";
import { createRing, SLOTS, HALF, CARD_H, CARD_W, type Ring } from "./ring";

export type StageCountry = {
  code: string;
  lat: number | null;
  lng: number | null;
  face: CardFace;
};

export type StageCallbacks = {
  onActiveChange: (index: number) => void;
  onOpen: (index: number) => void;
};

const RADIUS = 4;
const STEP = THREE.MathUtils.degToRad(17);
const EARTH_FOV = 30;
/** Where the outer edge of the second card from centre lands, as a share of the half-width. */
const FIVE_EDGE = 0.95;
/** Cards fade out between these many steps from centre, so desktop shows five. */
const FADE_FROM = 2.2;
const FADE_TO = 2.75;
/**
 * The tallest a card may be, as a share of the stage, however wide the screen.
 * The front card steps forward and grows on top of this, and its caption must
 * still clear "Where to next?" above it; past a third of the stage it does not.
 */
const MAX_CARD_FRAC = 0.33;
const TEX_ROOT = "/textures/earth/";

type TexEntry = {
  texture: THREE.CanvasTexture;
  color: THREE.Vector3;
  used: number;
  dead: boolean;
};

const mod = (n: number, m: number) => ((n % m) + m) % m;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
/**
 * The pin's height above the ground, in head radii, over its drop. It falls
 * under gravity for the first 62%, then makes one small, damped hop and
 * settles: a pin being set down, not a ball being dropped.
 */
function dropHeight(t: number) {
  const FALL = 0.62;
  if (t < FALL) {
    const u = t / FALL;
    return 7 * (1 - u * u);
  }
  const u = (t - FALL) / (1 - FALL);
  return Math.sin(u * Math.PI) * 0.7 * (1 - u);
}

export class StageEngine {
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private earthCam = new THREE.PerspectiveCamera(EARTH_FOV, 1, 0.01, 100);
  private ringCam = new THREE.PerspectiveCamera(50, 1, 0.05, 100);
  private earth: Earth | null = null;
  private ring: Ring;

  private cards: StageCountry[] = [];
  private textures = new Map<string, TexEntry>();
  private frame = 0;

  /* Ring physics, in card units. */
  private pos = 0;
  private vel = 0;
  private target: number | null = 0;
  private dragging = false;
  private pointerId: number | null = null;
  private lastX = 0;
  private lastT = 0;
  private moved = 0;
  private wheelTimer: ReturnType<typeof setTimeout> | null = null;
  private pxPerCard = 160;
  private hovered = -1;
  private active = -1;

  /* Globe spring. */
  private yaw = 0;
  private tilt = 0;
  private yawVel = 0;
  private tiltVel = 0;
  private yawTarget = 0;
  private tiltTarget = 0;
  private focusDir = new THREE.Vector3(0, 0.5, 0.86);
  /** Where the active country is; the pin goes there once the hall settles. */
  private pinTarget: THREE.Vector3 | null = null;
  /** Where the pin actually stands (or is lifting off from). */
  private pinShown: THREE.Vector3 | null = null;
  private pinPending = false;
  private settleTime = 0;
  private dropStart = -10;
  private retractStart = Infinity;

  /* Layout. */
  private width = 1;
  private height = 1;
  private mobile = false;
  private earthTopFrac = 0.7;
  private earthRadiusPx = 900;
  private headPx = 11;
  private scroll = 0;
  private intro = 0; // seconds since the planet's textures arrived; 0 until then
  private introStart: number | null = null;

  private timer = new THREE.Timer();
  private time = 0;
  private raf = 0;
  private running = false;
  private disposed = false;
  /** Still motion: the user asked for it, or the device cannot afford motion. */
  private reduced: boolean;
  /** Software WebGL: draw on demand only, at 1x, with the small maps. */
  private lowPower: boolean;
  /** In low-power mode, the frame loop runs until this `performance.now()`. */
  private awakeUntil = 0;
  /** The hall's shaders are compiled; until then there is nothing to draw. */
  private compiled = false;
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  constructor(
    private canvas: HTMLCanvasElement,
    private cb: StageCallbacks,
    countriesForMarkers: { lat: number; lng: number }[],
    /** From `detectLowPower`, which the page runs before it fetches three.js. */
    lowPower: boolean,
  ) {
    this.lowPower = lowPower;
    this.reduced = this.lowPower || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      // The composer draws into its own (non-multisampled) target, so MSAA on
      // the canvas would only ever smooth the final full-screen quad.
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    // 1.5x is past where the planet or the cards get visibly sharper, and a 2x
    // phone at 1.5x shades 44% fewer pixels a frame.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.lowPower ? 1 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    // The page's paper, for the frames before the sky is drawn (or if the planet never loads).
    this.renderer.setClearColor(0xf9f8f5, 1);

    this.ring = createRing(RADIUS);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());

    // The hall's shaders compile in the background (KHR_parallel_shader_compile
    // where there is one) instead of stalling the first frame; nothing is
    // drawn until they are ready.
    this.compileInBackground(this.ring.scene, this.ringCam)
      .catch(() => undefined)
      .then(() => {
        this.compiled = true;
        this.wake();
      });

    this.loadEarth(countriesForMarkers);
    this.bindEvents();
  }

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                */
  /* ---------------------------------------------------------------------- */

  private loadEarth(markers: { lat: number; lng: number }[]) {
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    // Decoded off the main thread where that is reliable. A plain <img> is
    // decoded on the main thread at upload, ~100ms for each 4K map. Safari and
    // Firefox < 98 mishandle ImageBitmap options, as three's GLTFLoader notes.
    const ua = navigator.userAgent;
    const firefox = ua.match(/Firefox\/(\d+)/);
    const bitmaps =
      typeof createImageBitmap !== "undefined" &&
      !/^((?!chrome|android).)*safari/i.test(ua) &&
      !(firefox && Number(firefox[1]) < 98);
    const bitmapLoader = new THREE.ImageBitmapLoader().setOptions({ imageOrientation: "flipY" });
    const imageLoader = new THREE.TextureLoader();
    const load = (name: string, srgb: boolean) =>
      new Promise<THREE.Texture>((resolve, reject) => {
        const done = (t: THREE.Texture) => {
          t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          t.anisotropy = aniso;
          resolve(t);
        };
        if (bitmaps) {
          bitmapLoader.load(
            TEX_ROOT + name,
            (bitmap) => {
              const t = new THREE.Texture(bitmap);
              t.flipY = false; // flipped during decode
              t.needsUpdate = true;
              done(t);
            },
            undefined,
            reject,
          );
        } else {
          imageLoader.load(TEX_ROOT + name, done, undefined, reject);
        }
      });

    // A phone's planet is ~400 CSS px across, where the 2K maps are already
    // texel-for-pixel; the 4K set is ~850KB more for nothing it can show.
    const res = this.lowPower || window.innerWidth < 768 ? "2k" : "4k";

    Promise.all([
      load(`day-${res}.webp`, true),
      load(`night-${res}.webp`, true),
      load("ocean-2k.webp", false),
      load(`normal-${res}.webp`, false),
      load("clouds-2k.webp", false),
    ])
      .then(async ([day, night, ocean, normal, clouds]) => {
        const maps = [day, night, ocean, normal, clouds];
        const earth = createEarth({ day, night, ocean, normal, clouds }, markers);
        const abandon = () => {
          maps.forEach((t) => t.dispose());
          earth.dispose();
        };
        if (this.disposed) return abandon();

        // One map per task, then the shaders in the background, so the planet
        // arrives as several short tasks instead of one long stall.
        for (const t of maps) {
          this.renderer.initTexture(t);
          await new Promise((r) => setTimeout(r, 0));
          if (this.disposed) return abandon();
        }
        await this.compileInBackground(earth.scene, this.earthCam).catch(() => undefined);
        if (this.disposed) return abandon();
        this.earth = earth;

        this.buildComposer();
        this.resize(this.width, this.height);
        this.startIntro();
        this.retargetGlobe(true);

        // The full 8K day map, only where it can be seen: a large, dense
        // screen on a GPU that takes it, and only once the page has settled.
        const big =
          !this.lowPower &&
          window.innerWidth >= 1100 &&
          window.devicePixelRatio >= 1.5 &&
          this.renderer.capabilities.maxTextureSize >= 8192;
        if (big) {
          const swap = () =>
            load("day-8k.webp", true)
              .then((t) => {
                if (this.disposed || !this.earth) return t.dispose();
                const old = this.earth.earthMat.uniforms.dayMap.value as THREE.Texture;
                this.earth.earthMat.uniforms.dayMap.value = t;
                old.dispose();
              })
              .catch(() => undefined);
          if ("requestIdleCallback" in window) {
            window.requestIdleCallback(swap, { timeout: 8000 });
          } else {
            setTimeout(swap, 4000);
          }
        }
      })
      .catch(() => {
        // No planet: the hall still works on its own.
        this.buildComposer();
        this.startIntro();
      });
  }

  /** The planet rises and the cards come up; a low-power device skips to the end. */
  private startIntro() {
    this.introStart = this.lowPower ? this.time - 10 : this.time;
    this.wake();
  }

  /**
   * `compileAsync`, for the target the scene is really drawn into. three keys
   * each program on its output colour space, and the composer renders into a
   * linear offscreen buffer, not the canvas: compiled against the canvas, the
   * programs the first frame needs were not the ones compiled, and it stalled
   * for seconds linking them (Direct3D's shader compiler is slow).
   */
  private compileInBackground(scene: THREE.Scene, camera: THREE.Camera) {
    const previous = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.composer.readBuffer);
    // compileAsync starts every compile synchronously, so the target can be
    // restored straight away; only the wait for completion is asynchronous.
    const done = this.renderer.compileAsync(scene, camera);
    this.renderer.setRenderTarget(previous);
    return done;
  }

  private buildComposer() {
    this.composer.passes.forEach((p) => p.dispose?.());
    this.composer.passes.length = 0;
    if (this.earth) {
      this.composer.addPass(new RenderPass(this.earth.scene, this.earthCam));
    }
    const ringPass = new RenderPass(this.ring.scene, this.ringCam);
    if (this.earth) {
      ringPass.clear = false;
      ringPass.clearDepth = true;
    }
    this.composer.addPass(ringPass);
    this.composer.addPass(new OutputPass());
  }

  /* ---------------------------------------------------------------------- */
  /* Public API                                                             */
  /* ---------------------------------------------------------------------- */

  setCards(cards: StageCountry[]) {
    const activeCode = this.active >= 0 ? this.cards[this.active]?.code : undefined;
    this.cards = cards;
    const keep = activeCode ? cards.findIndex((c) => c.code === activeCode) : -1;
    this.pos = keep >= 0 ? keep : 0;
    this.target = this.pos;
    this.vel = 0;
    this.active = -1;
    this.ring.slots.forEach((s) => (s.index = null));
    this.updateActive();
    this.wake();
  }

  /** Snap straight to a destination, without the hall turning to reach it. */
  jumpTo(index: number) {
    const n = this.cards.length;
    if (!n) return;
    this.pos = this.target = THREE.MathUtils.clamp(index, 0, n - 1);
    this.vel = 0;
    this.updateActive();
    this.retargetGlobe(true);
    this.wake();
  }

    step(delta: number) {
    if (!this.cards.length) return;
    const base = this.target ?? Math.round(this.pos);
    this.target = this.clampTarget(base + delta);
    this.wake();
  }

  goTo(index: number) {
    const n = this.cards.length;
    if (!n) return;
    this.wake();
    if (!this.wraps()) {
      this.target = THREE.MathUtils.clamp(index, 0, n - 1);
      return;
    }
    const base = Math.round(this.target ?? this.pos);
    let delta = mod(index - mod(base, n), n);
    if (delta > n / 2) delta -= n;
    this.target = base + delta;
  }

  setRunning(on: boolean) {
    if (on === this.running || this.disposed) return;
    this.running = on;
    if (on) {
      this.wake();
      this.schedule();
    } else {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  /** 0 while the stage fills the viewport, rising to 1 as it scrolls away. */
  setScroll(progress: number) {
    const next = THREE.MathUtils.clamp(progress, 0, 1);
    if (next === this.scroll) return;
    this.scroll = next;
    this.wake(250);
  }

  resize(w: number, h: number) {
    if (w < 2 || h < 2) return;
    this.wake(250);
    this.width = w;
    this.height = h;
    this.mobile = w < 768;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);

    const dpr = this.renderer.getPixelRatio();
    if (this.earth) {
      this.earth.skyMat.uniforms.uRes.value.set(w, h);
      this.earth.starMat.uniforms.uPixel.value = dpr;
      this.earth.markerMat.uniforms.uPixel.value = dpr;
    }

    /* The planet: as wide as the layout allows, its limb at ~70% down. */
    this.earthRadiusPx = this.mobile ? w * 1.05 : Math.max(w * 0.6, h * 0.95);
    this.earthTopFrac = this.mobile ? 0.7 : 0.69;
    this.headPx = this.mobile ? 9 : 11;

    /* The hall. */
    const aspect = w / h;
    const camBack = this.mobile ? 0.4 : 1.0;
    const eye = CARD_H * 0.5;
    const depth = RADIUS + camBack;
    const waterline = this.mobile ? 0.565 : 0.6; // from the top
    let f: number;
    if (this.mobile) {
      const cardFrac = 0.29; // centre card's height, as a share of the stage
      f = (cardFrac * 2 * depth) / CARD_H;
    } else {
      // Five cards across on desktop: the zoom is solved from the width so the
      // second card either side of centre sits wholly inside the frame (its
      // outer edge at FIVE_EDGE of the half-width). Capped by height, so the
      // front card's caption clears the title; where the cap binds, the third
      // card would show at the edges, and the fade in layoutRing removes it.
      const a2 = STEP * 2;
      const edgeX = RADIUS * Math.sin(a2) + (CARD_W / 2) * Math.cos(a2);
      const edgeDepth = RADIUS * Math.cos(a2) - (CARD_W / 2) * Math.sin(a2) + camBack;
      const fFive = (FIVE_EDGE * aspect * edgeDepth) / edgeX;
      const fMax = (MAX_CARD_FRAC * 2 * depth) / CARD_H;
      f = Math.min(fFive, fMax);
    }
    const cam = this.ringCam;
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(1 / f));
    cam.aspect = aspect;
    cam.position.set(0, eye, camBack);
    cam.lookAt(0, eye, -10);
    cam.updateProjectionMatrix();
    const ndcWater = 1 - 2 * waterline;
    cam.projectionMatrix.elements[9] = (-f * eye) / depth - ndcWater;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();

    // Pixels per card at the front of the ring, so a drag tracks the finger.
    this.pxPerCard = (f / aspect) * ((RADIUS * STEP) / depth) * (w / 2);

    this.layoutEarthCamera();
  }

  dispose() {
    this.disposed = true;
    this.setRunning(false);
    this.unbindEvents();
    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    this.textures.forEach((e) => {
      e.dead = true;
      e.texture.dispose();
    });
    this.textures.clear();
    if (this.earth) {
      const u = this.earth.earthMat.uniforms;
      [u.dayMap, u.nightMap, u.oceanMap, u.normalMap, u.cloudMap].forEach((x) =>
        (x.value as THREE.Texture).dispose(),
      );
      this.earth.dispose();
    }
    this.ring.dispose();
    this.composer.passes.forEach((p) => p.dispose?.());
    this.composer.dispose();
    // No forceContextLoss: React keeps the same <canvas> across remounts, and
    // a lost context would leave the next engine drawing into nothing.
    this.renderer.dispose();
  }

  /* ---------------------------------------------------------------------- */
  /* Layout helpers                                                         */
  /* ---------------------------------------------------------------------- */

  private layoutEarthCamera() {
    const { width: w, height: h } = this;
    const cam = this.earthCam;
    const t = Math.tan(THREE.MathUtils.degToRad(EARTH_FOV / 2));

    // The intro raises the planet into place; scrolling away lets it sink.
    const introT = easeOutCubic(Math.min(1, this.intro / 2.4));
    const sink = (1 - introT) * 0.22 + this.scroll * 0.1;
    const topFrac = this.earthTopFrac + sink;

    const rN = this.earthRadiusPx / (h / 2);
    const alpha = Math.atan(rN * t);
    const dist = 1 / Math.sin(alpha);
    cam.fov = EARTH_FOV;
    cam.aspect = w / h;
    cam.position.set(0, 0, dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    const centreNdc = 1 - 2 * topFrac - rN;
    cam.projectionMatrix.elements[9] = -centreNdc;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.updateMatrixWorld();

    // Where on the sphere the active country should come to rest: a point
    // a little below the limb, on the centre line.
    const focusFrac = this.earthTopFrac + (1 - this.earthTopFrac) * 0.13;
    this.ndc.set(0, 1 - 2 * focusFrac);
    this.raycaster.setFromCamera(this.ndc, cam);
    const hit = this.raycaster.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), 1), new THREE.Vector3());
    if (hit) {
      this.focusDir.copy(hit).normalize();
      this.retargetGlobe(false);
    }
  }

  private wraps() {
    return this.cards.length >= SLOTS;
  }

  private clampTarget(t: number) {
    return this.wraps() ? t : THREE.MathUtils.clamp(t, 0, Math.max(0, this.cards.length - 1));
  }

  /* ---------------------------------------------------------------------- */
  /* Active country → globe                                                 */
  /* ---------------------------------------------------------------------- */

  private updateActive() {
    const n = this.cards.length;
    const next = n ? mod(Math.round(this.pos), n) : -1;
    if (next === this.active) return;
    this.active = next;
    this.cb.onActiveChange(next);
    this.retargetGlobe(false);
    // Do not chase every card that passes the front: lift the current pin off
    // and wait for the hall to come to rest before setting the next one down.
    this.pinPending = true;
    this.settleTime = 0;
    if (this.pinShown && this.retractStart === Infinity) this.retractStart = this.time;
  }

  private retargetGlobe(snap: boolean) {
    const c = this.active >= 0 ? this.cards[this.active] : undefined;
    if (!c || c.lat == null || c.lng == null) {
      this.pinTarget = null;
      return;
    }
    const lat = THREE.MathUtils.degToRad(c.lat);
    const lng = THREE.MathUtils.degToRad(c.lng);
    const yaw = -Math.atan2(Math.cos(lng), -Math.sin(lng));
    const tilt = lat - Math.atan2(this.focusDir.y, this.focusDir.z);
    // Take the short way round.
    const k = Math.round((this.yawTarget - yaw) / (Math.PI * 2));
    this.yawTarget = yaw + k * Math.PI * 2;
    this.tiltTarget = tilt;
    this.pinTarget = latLngToVec(c.lat, c.lng, 1);
    if (snap) {
      this.yaw = this.yawTarget;
      this.tilt = this.tiltTarget;
      this.yawVel = this.tiltVel = 0;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Card textures                                                          */
  /* ---------------------------------------------------------------------- */

  private textureFor(c: StageCountry): TexEntry {
    let e = this.textures.get(c.code);
    if (e) {
      e.used = this.frame;
      return e;
    }
    const canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const mean = paintCard(canvas, c.face, null, null);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    e = { texture, color: new THREE.Vector3(...mean), used: this.frame, dead: false };
    this.textures.set(c.code, e);

    const entry = e;
    waitForFonts().then(async () => {
      const [photo, flag] = await Promise.all([
        c.face.photo ? loadImage(c.face.photo) : Promise.resolve(null),
        loadImage(`https://flagcdn.com/w160/${c.code}.png`),
      ]);
      if (entry.dead) return;
      const m = paintCard(canvas, c.face, photo, flag);
      entry.color.set(...m);
      entry.texture.needsUpdate = true;
      this.wake(0);
    });

    this.pruneTextures();
    return e;
  }

  private pruneTextures() {
    if (this.textures.size <= 48) return;
    const inUse = new Set(
      this.ring.slots
        .filter((s) => s.index != null)
        .map((s) => this.cards[mod(s.index!, this.cards.length)]?.code),
    );
    const victims = [...this.textures.entries()]
      .filter(([code]) => !inUse.has(code))
      .sort((a, b) => a[1].used - b[1].used)
      .slice(0, this.textures.size - 40);
    for (const [code, e] of victims) {
      e.dead = true;
      e.texture.dispose();
      this.textures.delete(code);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Input                                                                  */
  /* ---------------------------------------------------------------------- */

  private bindEvents() {
    const c = this.canvas;
    c.addEventListener("pointerdown", this.onDown);
    c.addEventListener("pointermove", this.onMove);
    c.addEventListener("pointerup", this.onUp);
    c.addEventListener("pointercancel", this.onCancel);
    c.addEventListener("pointerleave", this.onLeave);
    c.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private unbindEvents() {
    const c = this.canvas;
    c.removeEventListener("pointerdown", this.onDown);
    c.removeEventListener("pointermove", this.onMove);
    c.removeEventListener("pointerup", this.onUp);
    c.removeEventListener("pointercancel", this.onCancel);
    c.removeEventListener("pointerleave", this.onLeave);
    c.removeEventListener("wheel", this.onWheel);
  }

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 || !this.cards.length) return;
    this.wake();
    this.dragging = true;
    this.pointerId = e.pointerId;
    this.lastX = e.clientX;
    this.lastT = performance.now();
    this.moved = 0;
    this.vel = 0;
    this.target = null;
    this.canvas.style.cursor = "grabbing";
  };

  private onMove = (e: PointerEvent) => {
    if (this.dragging && e.pointerId === this.pointerId) {
      const now = performance.now();
      const dx = e.clientX - this.lastX;
      const dt = Math.max(1, now - this.lastT) / 1000;
      this.lastX = e.clientX;
      this.lastT = now;
      this.moved += Math.abs(dx);
      if (this.moved > 4 && !this.canvas.hasPointerCapture(e.pointerId)) {
        this.canvas.setPointerCapture(e.pointerId);
      }
      let d = -dx / this.pxPerCard;
      // Rubber band past the ends of a short, non-wrapping hall.
      if (!this.wraps()) {
        const max = this.cards.length - 1;
        if (this.pos < 0 || this.pos > max) d *= 0.35;
      }
      this.pos += d;
      this.vel = THREE.MathUtils.lerp(this.vel, d / dt, 0.4);
      return;
    }
    if (e.pointerType === "mouse") this.hoverAt(e);
  };

  private onUp = (e: PointerEvent) => {
    if (!this.dragging || e.pointerId !== this.pointerId) return;
    this.wake();
    this.dragging = false;
    this.pointerId = null;
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (this.moved < 6) {
      this.target = this.clampTarget(Math.round(this.pos));
      this.clickAt(e);
    } else {
      // Inertia: carry the flick forward, then settle on a card.
      const flick = THREE.MathUtils.clamp(this.vel * 0.3, -8, 8);
      this.target = this.clampTarget(Math.round(this.pos + flick));
    }
    this.hoverAt(e);
  };

  private onCancel = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.dragging = false;
    this.pointerId = null;
    this.target = this.clampTarget(Math.round(this.pos));
  };

  private onLeave = () => {
    if (!this.dragging) {
      this.hovered = -1;
      this.canvas.style.cursor = "";
    }
  };

  private onWheel = (e: WheelEvent) => {
    // Only sideways scrolling turns the hall; vertical wheel still scrolls the page.
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || !this.cards.length) return;
    e.preventDefault();
    this.wake();
    this.target = null;
    this.vel = 0;
    this.pos += (e.deltaX / this.pxPerCard) * 0.6;
    if (!this.wraps()) this.pos = THREE.MathUtils.clamp(this.pos, -0.3, this.cards.length - 0.7);
    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => {
      this.target = this.clampTarget(Math.round(this.pos));
    }, 110);
  };

  private pick(e: PointerEvent): number {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.ringCam);
    const meshes = this.ring.slots.filter((s) => s.index != null && s.card.visible).map((s) => s.card);
    const hit = this.raycaster.intersectObjects(meshes, false)[0];
    if (!hit) return -1;
    return hit.object.userData.slot as number;
  }

  private hoverAt(e: PointerEvent) {
    const s = this.pick(e);
    if (s !== this.hovered) this.wake(600);
    this.hovered = s;
    this.canvas.style.cursor = s >= 0 ? "pointer" : "grab";
  }

  private clickAt(e: PointerEvent) {
    const s = this.pick(e);
    if (s < 0) return;
    const index = this.ring.slots[s].index;
    if (index == null) return;
    const n = this.cards.length;
    if (mod(index, n) === this.active && Math.abs(this.pos - Math.round(this.pos)) < 0.25) {
      this.cb.onOpen(this.active);
    } else {
      this.target = this.clampTarget(index);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Frame                                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * Keep drawing for at least `ms` more. A no-op off low-power devices, where
   * the loop never stops while the stage is on screen; on them it restarts a
   * loop that has gone to sleep. `wake(0)` draws exactly one more frame.
   */
  private wake(ms = 1500) {
    if (!this.lowPower) return;
    this.awakeUntil = Math.max(this.awakeUntil, performance.now() + ms);
    this.schedule();
  }

  private schedule() {
    if (!this.running || this.disposed || this.raf) return;
    this.timer.reset();
    this.raf = requestAnimationFrame(this.tick);
  }

  private tick = (now: number) => {
    this.raf = 0;
    if (!this.running) return;
    // Low power: sleep once nothing has moved for a while. Still motion is on
    // there, so nothing changes on screen between wakes.
    if (!this.lowPower || this.dragging || performance.now() < this.awakeUntil) {
      this.raf = requestAnimationFrame(this.tick);
    }
    this.timer.update(now);
    // rAF's timestamp is the frame's start, which can precede the reset that
    // resumed the loop, so the first delta may come out negative.
    const dt = THREE.MathUtils.clamp(this.timer.getDelta(), 0, 1 / 20);
    this.time += dt;
    this.frame++;
    if (this.introStart !== null) this.intro = Math.max(0, this.time - this.introStart);

    this.stepRing(dt);
    this.updateActive();
    this.trackSettle(dt);
    this.layoutRing(dt);
    this.layoutEarthCamera();
    this.stepGlobe(dt);

    if (this.compiled) this.composer.render(dt);
  };

  /** How long the hall has been at rest; the pin drops after a short pause. */
  private trackSettle(dt: number) {
    const atRest =
      !this.dragging &&
      this.target != null &&
      Math.abs(this.target - this.pos) < 0.03 &&
      Math.abs(this.vel) < 0.08;
    this.settleTime = atRest ? this.settleTime + dt : 0;
    const wait = this.reduced ? 0 : 0.45;
    // The first drop also waits for the planet to have faded in.
    if (this.pinPending && this.settleTime >= wait && this.pinTarget && this.intro > 1.1) {
      this.pinPending = false;
      this.pinShown = this.pinTarget.clone();
      this.dropStart = this.time;
      this.retractStart = Infinity;
    }
  }

  private stepRing(dt: number) {
    if (this.dragging || this.target == null) return;
    const k = this.reduced ? 260 : 75;
    const c = 2 * Math.sqrt(k);
    const acc = k * (this.target - this.pos) - c * this.vel;
    this.vel += acc * dt;
    this.pos += this.vel * dt;
    if (Math.abs(this.target - this.pos) < 0.0004 && Math.abs(this.vel) < 0.002) {
      this.pos = this.target;
      this.vel = 0;
    }
  }

  private layoutRing(dt: number) {
    const n = this.cards.length;
    const ring = this.ring;
    const base = Math.round(this.pos);
    const maxAngle = STEP * HALF;

    // Cards come up out of the water one after another, centre outwards.
    const introT = this.intro;
    const t = this.time;

    const uCards = ring.poolMat.uniforms.uCards.value as THREE.Vector4[];
    const uColors = ring.poolMat.uniforms.uColors.value as THREE.Vector3[];
    ring.poolMat.uniforms.uTime.value = t;
    ring.poolMat.uniforms.uReveal.value = Math.min(1, introT / 1.2);

    ring.slots.forEach((slot, s) => {
      const i = base + (s - HALF);
      const visible = n > 0 && (this.wraps() || (i >= 0 && i < n));
      slot.card.visible = slot.refl.visible = visible;
      if (!visible) {
        slot.index = null;
        uCards[s].set(0, 0, 0, 0);
        return;
      }
      slot.index = i;
      const a = (i - this.pos) * STEP;
      // Five cards on desktop: past the second either side of centre, a card
      // fades out (and stops taking clicks), so the frame never holds more
      // than five, however wide the screen and wherever the zoom settles.
      const edge = this.mobile
        ? 1
        : 1 - THREE.MathUtils.smoothstep(Math.abs(a), STEP * FADE_FROM, STEP * FADE_TO);
      if (edge <= 0.001) {
        slot.card.visible = slot.refl.visible = false;
        slot.index = null;
        uCards[s].set(0, 0, 0, 0);
        return;
      }
      // Only now: a card faded out at the edge never fetches its photograph.
      const tex = this.textureFor(this.cards[mod(i, n)]);
      const reveal =THREE.MathUtils.clamp((introT - 0.25 - Math.abs(s - HALF) * 0.09) / 0.7, 0, 1);
      const rise = (1 - easeOutCubic(reveal)) * -0.35;

      // The card that arrives at the front steps out toward the viewer once
      // the hall slows, and steps back as soon as it starts moving again.
      const closeness = 1 - THREE.MathUtils.smoothstep(Math.abs(i - this.pos), 0, 0.5);
      const moving = this.dragging || Math.abs(this.vel) > 0.6;
      const popTarget = moving ? closeness * 0.25 : closeness;
      slot.pop += (popTarget - slot.pop) * Math.min(1, dt * (this.reduced ? 30 : 7));
      const pop = easeOutCubic(slot.pop);

      const r = RADIUS - 0.42 * pop;
      const lift = 0.03 * pop;
      const grow = 1 + 0.04 * pop;
      const x = r * Math.sin(a);
      const z = -r * Math.cos(a);
      slot.card.position.set(x, rise + lift, z);
      slot.card.rotation.y = -a;
      slot.card.scale.setScalar(grow);
      slot.refl.position.set(x, -(rise + lift), z);
      slot.refl.rotation.y = -a;
      slot.refl.scale.set(grow, -grow, grow);

      const target = s === this.hovered ? 1 : 0;
      slot.hover += (target - slot.hover) * Math.min(1, dt * 7);
      const dim = 1 - THREE.MathUtils.smoothstep(Math.abs(a), STEP * 0.4, maxAngle) * 0.85;

      const cu = slot.card.material.uniforms;
      cu.map.value = tex.texture;
      cu.uDim.value = dim + pop * 0.08;
      cu.uHover.value = slot.hover;
      cu.uReveal.value = reveal * edge;
      const ru = slot.refl.material.uniforms;
      ru.map.value = tex.texture;
      ru.uTime.value = t;
      ru.uDim.value = dim;
      ru.uReveal.value = reveal * edge;

      // The pool of light sits just in front of the card, toward the viewer.
      uCards[s].set(x - Math.sin(a) * 0.55, z + Math.cos(a) * 0.55, a, dim * reveal * edge);
      uColors[s].copy(tex.color).multiplyScalar(1.6);
    });
  }

  private stepGlobe(dt: number) {
    const earth = this.earth;
    if (!earth) return;
    const t = this.time;
    const reveal = Math.min(1, this.intro / 1.6);

    // Critically damped, a little behind the hall so the planet feels heavy.
    const w = this.reduced ? 14 : 5.2;
    this.yawVel += (w * w * (this.yawTarget - this.yaw) - 2 * w * this.yawVel) * dt;
    this.tiltVel += (w * w * (this.tiltTarget - this.tilt) - 2 * w * this.tiltVel) * dt;
    this.yaw += this.yawVel * dt;
    this.tilt += this.tiltVel * dt;

    const drift = this.reduced ? 0 : Math.sin(t * 0.11) * 0.018;
    const swing = this.scroll * 0.35;
    earth.globe.rotation.set(this.tilt, this.yaw + drift + swing, 0);
    earth.globe.updateMatrixWorld();

    const shift = this.reduced ? 0 : t * 0.0022;
    earth.earthMat.uniforms.cloudShift.value = shift;
    earth.cloudMat.uniforms.cloudShift.value = shift;
    earth.earthMat.uniforms.reveal.value = reveal;
    earth.cloudMat.uniforms.reveal.value = reveal;
    earth.haloMat.uniforms.reveal.value = reveal;
    earth.markerMat.uniforms.reveal.value = reveal;
    earth.markerMat.uniforms.uTime.value = t;
    earth.starMat.uniforms.reveal.value = Math.min(1, this.intro);
    earth.starMat.uniforms.uTime.value = this.reduced ? 0 : t;
    earth.starMat.uniforms.uDrift.value.set(this.reduced ? 0 : t * 0.002, this.scroll * 0.15);

    /* The pin. */
    // Lifting off the previous country: shrink away, then clear it.
    const retract = THREE.MathUtils.clamp((t - this.retractStart) / 0.22, 0, 1);
    if (retract >= 1) {
      this.pinShown = null;
      this.retractStart = Infinity;
    }
    const visible = this.pinShown != null && reveal > 0.5;
    earth.pin.visible = earth.ground.visible = visible;
    if (!visible || !this.pinShown) return;

    const P = this.pinShown.clone().applyMatrix4(earth.globe.matrixWorld);
    const normal = P.clone().normalize();
    const camDist = P.distanceTo(this.earthCam.position);
    const worldPerPx = (2 * camDist * Math.tan(THREE.MathUtils.degToRad(EARTH_FOV / 2))) / this.height;
    const scale = this.headPx * worldPerPx;

    // Lean toward screen-up so it reads as a standing 📍, not a dot seen from above.
    const up = normal.clone().multiplyScalar(0.42).add(new THREE.Vector3(0, 0.58, 0)).normalize();

    const dropT = THREE.MathUtils.clamp((t - this.dropStart) / (this.reduced ? 0.01 : 0.7), 0, 1);
    const height = this.reduced ? 0 : dropHeight(dropT);
    const b = 1 - Math.min(1, height / 7); // 0 high in the air, 1 on the ground
    const lift = (height + retract * 3) * scale;
    const pop = Math.min(1, dropT * 4) * (1 - easeOutCubic(retract));

    earth.pin.position.copy(P).addScaledVector(up, lift);
    earth.pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    earth.pin.scale.setScalar(scale * Math.max(0.001, 0.55 + 0.45 * pop) * (1 - retract * 0.999));

    earth.ground.position.copy(P).addScaledVector(normal, 0.0008);
    earth.ground.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    earth.ground.scale.setScalar(scale);
    earth.shadow.scale.setScalar(3.4 + (1 - b) * 2.5);
    earth.shadowMat.uniforms.uOpacity.value = 0.5 * b * pop;

    // Radar pings once it has landed.
    const landed = retract > 0 ? -1 : t - (this.dropStart + 0.5);
    earth.pings.forEach((m, i) => {
      const period = 2.4;
      const ph = landed < 0 || this.reduced ? 1 : ((landed / period + i / 3) % 1);
      const mat = m.material as THREE.ShaderMaterial;
      mat.uniforms.uT.value = Math.max(0.0001, ph);
      m.scale.setScalar(20);
    });
  }
}
