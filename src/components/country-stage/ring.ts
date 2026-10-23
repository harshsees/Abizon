/**
 * THE HALL — after Mirror Hall: portrait cards standing in a ring around the
 * viewer on a pale, still pool, each card mirrored in the water below with a
 * slow ripple running through the reflection, and the colour of every card
 * tinting the surface beneath it.
 *
 * By day, cards further round the ring recede by fading toward the sky rather
 * than by darkening: a darkened card on a light page reads as a dirty one.
 *
 * The camera stands inside the ring. That is what makes the nearer cards at
 * the edges loom larger than the one straight ahead, and why the captions above
 * them follow the curve.
 *
 * The ring is virtual: a fixed pool of SLOTS meshes is re-dealt every frame
 * around the current position, so 155 destinations cost the same as eight.
 */

import * as THREE from "three";

import { CARD_FRAC, TEX_H, TEX_W } from "./cardTexture";

export const SLOTS = 13; // the visible arc plus a card of margin either side
export const HALF = (SLOTS - 1) / 2;
export const CARD_W = 1;
export const CARD_TEX_H = (CARD_W * TEX_H) / TEX_W; // card + caption
export const CARD_H = CARD_TEX_H * CARD_FRAC;

const cardVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cardFrag = /* glsl */ `
  uniform sampler2D map;
  uniform float uDim;
  uniform float uHover;
  uniform float uReveal;
  uniform float uCardFrac;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(map, vUv);
    bool caption = vUv.y > uCardFrac;
    vec3 col = c.rgb;
    if (!caption) {
      // A sheen sweeping across the glass of the hovered card.
      float sweep = smoothstep(0.12, 0.0, abs(vUv.x - vUv.y * 0.35 - (uHover * 1.6 - 0.3)));
      col += sweep * uHover * 0.10;
      col *= mix(0.86, 1.04, uDim) + uHover * 0.05;
    } else {
      col *= mix(0.9, 1.0, uDim);
    }
    gl_FragColor = vec4(col, c.a * mix(0.5, 1.0, uDim) * uReveal);
    #include <colorspace_fragment>
  }
`;

/**
 * The reflection is the same mesh flipped through the waterline. The ripple is
 * two travelling sines bent by a third, stronger the further from the card's
 * foot — still water close to the card, moving water further out — and the
 * mip bias blurs it the same way.
 */
const reflFrag = /* glsl */ `
  uniform sampler2D map;
  uniform float uTime;
  uniform float uDim;
  uniform float uReveal;
  uniform float uCardFrac;
  varying vec2 vUv;
  void main() {
    if (vUv.y > uCardFrac * 0.6) discard;
    // The flipped mesh puts uv.y = 0 at the waterline; k is 1 there, 0 at the card's top.
    float k = 1.0 - vUv.y / uCardFrac;
    vec2 uv = vUv;
    float bend = sin(uv.x * 7.0 + uTime * 0.6) * 1.4;
    float w = sin(uv.y * 62.0 - uTime * 1.9 + bend) * 0.0045 + sin(uv.y * 23.0 + uTime * 1.2 + uv.x * 3.0) * 0.0035;
    float strength = 0.35 + (1.0 - k) * 1.8;
    uv.x += w * strength;
    uv.y += w * 0.6 * strength;
    vec4 c = texture2D(map, uv, 1.5 + (1.0 - k) * 2.5);
    // Faint: a glossy floor by day, not a dark mirror.
    float fade = pow(smoothstep(0.55, 1.0, k), 1.8) * 0.18 * mix(0.5, 1.0, uDim);
    vec3 col = c.rgb * vec3(0.92, 0.95, 1.0);
    gl_FragColor = vec4(col, c.a * fade * uReveal);
    #include <colorspace_fragment>
  }
`;

/**
 * The pool: the colour each card throws on the water, broken up by a moving
 * caustic so it shimmers. Alpha-blended — by day a card tints the water rather
 * than lighting it. It fades out well before the planet's limb.
 */
const poolVert = /* glsl */ `
  varying vec3 vPosW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const poolFrag = /* glsl */ `
  #define SLOTS ${SLOTS}
  uniform vec4 uCards[SLOTS];   // x, z, facing angle, intensity
  uniform vec3 uColors[SLOTS];
  uniform float uTime;
  uniform float uRadius;
  uniform float uReveal;
  varying vec3 vPosW;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }

  void main() {
    vec2 p = vPosW.xz;
    vec3 col = vec3(0.0);
    float w = 0.0;
    float caustic = noise(p * 3.2 + vec2(uTime * 0.25, -uTime * 0.18)) * 0.6 + noise(p * 7.0 - uTime * 0.3) * 0.4;
    for (int i = 0; i < SLOTS; i++) {
      vec4 c = uCards[i];
      if (c.w <= 0.0) continue;
      vec2 d = p - c.xy;
      float ca = cos(c.z), sa = sin(c.z);
      // Into card-local axes: along its width, and toward the viewer.
      vec2 l = vec2(d.x * ca + d.y * sa, -d.x * sa + d.y * ca);
      float g = exp(-(l.x * l.x) / 0.30 - (l.y * l.y) / 1.1);
      col += uColors[i] * g * c.w;
      w += g * c.w;
    }
    // The weighted mean colour of the cards above this point, and how much of it.
    col /= max(w, 1e-4);
    float a = min(w, 1.0) * (0.55 + caustic * 0.75);
    // Fade the pool toward the viewer so it never reaches the planet.
    float r = length(p);
    float fade = smoothstep(uRadius * 0.35, uRadius * 0.95, r) * (1.0 - smoothstep(uRadius * 1.02, uRadius * 1.25, r));
    gl_FragColor = vec4(col, a * fade * 0.16 * uReveal);
    #include <colorspace_fragment>
  }
`;

export type Slot = {
  card: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  refl: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  /** Absolute ring index currently dealt to this slot, or null when hidden. */
  index: number | null;
  hover: number;
  /** 0-1: how far this card has stepped forward out of the ring. */
  pop: number;
};

export function createRing(radius: number) {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  scene.add(group);

  const geo = new THREE.PlaneGeometry(CARD_W, CARD_TEX_H, 1, 1);
  geo.translate(0, CARD_TEX_H / 2, 0);

  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  blank.needsUpdate = true;

  const slots: Slot[] = [];
  for (let i = 0; i < SLOTS; i++) {
    const card = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: cardVert,
        fragmentShader: cardFrag,
        uniforms: {
          map: { value: blank },
          uDim: { value: 1 },
          uHover: { value: 0 },
          uReveal: { value: 0 },
          uCardFrac: { value: CARD_FRAC },
        },
        transparent: true,
      }),
    );
    card.renderOrder = 2;
    const refl = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: cardVert,
        fragmentShader: reflFrag,
        uniforms: {
          map: { value: blank },
          uTime: { value: 0 },
          uDim: { value: 1 },
          uReveal: { value: 0 },
          uCardFrac: { value: CARD_FRAC },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    refl.scale.y = -1;
    refl.renderOrder = 1;
    card.userData.slot = i;
    group.add(card, refl);
    slots.push({ card, refl, index: null, hover: 0, pop: 0 });
  }

  const poolMat = new THREE.ShaderMaterial({
    vertexShader: poolVert,
    fragmentShader: poolFrag,
    uniforms: {
      uCards: { value: Array.from({ length: SLOTS }, () => new THREE.Vector4()) },
      uColors: { value: Array.from({ length: SLOTS }, () => new THREE.Vector3()) },
      uTime: { value: 0 },
      uRadius: { value: radius },
      uReveal: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.3, 96), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = -0.002;
  pool.renderOrder = 0;
  scene.add(pool);

  return {
    scene,
    group,
    slots,
    poolMat,
    blank,
    dispose() {
      geo.dispose();
      blank.dispose();
      slots.forEach((s) => {
        s.card.material.dispose();
        s.refl.material.dispose();
      });
      pool.geometry.dispose();
      poolMat.dispose();
    },
  };
}

export type Ring = ReturnType<typeof createRing>;
