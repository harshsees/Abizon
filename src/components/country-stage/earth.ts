/**
 * THE EARTH — after Ascend's hero: a photoreal planet sunk into the bottom of
 * the frame, drifting cloud shells and a pale blue limb, set in a daylight
 * sky rather than in space.
 *
 * LIGHT, NOT NIGHT. The homepage is a light page, so the planet is seen by
 * day: the sun stands in front of it, the far side is lifted to a soft
 * blue-grey instead of black (a black limb against a pale sky reads as a hole
 * in the page), and every glow that used to be additive — the halo, the radar
 * dots, the ping — is alpha-blended, because adding light to white adds
 * nothing. The planet fades in by opacity, not up from black.
 *
 * Texture maps are Solar System Scope's (CC BY 4.0, credited on
 * /image-credits), re-encoded to WebP under /public/textures/earth.
 *
 * Coordinates: lat/lng → a unit vector with 0° at +X and 90°E at −Z, which is
 * how three's SphereGeometry lays an equirectangular map on the sphere.
 */

import * as THREE from "three";

export function latLngToVec(lat: number, lng: number, r = 1): THREE.Vector3 {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lng);
  return new THREE.Vector3(
    Math.cos(la) * Math.cos(lo) * r,
    Math.sin(la) * r,
    -Math.cos(la) * Math.sin(lo) * r,
  );
}

/* -------------------------------------------------------------------------- */
/* Shaders                                                                    */
/* -------------------------------------------------------------------------- */

const earthVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vTanW;
  varying vec3 vBitW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vec3 n = normalize(normal);
    // East and north on the sphere, analytically: no seam at the antimeridian.
    vec3 east = normalize(vec3(n.z, 0.0, -n.x) + vec3(1e-5, 0.0, 0.0));
    vec3 north = cross(n, east);
    mat3 m = mat3(modelMatrix);
    vNormalW = normalize(m * n);
    vTanW = normalize(m * east);
    vBitW = normalize(m * north);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const earthFrag = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D oceanMap;
  uniform sampler2D normalMap;
  uniform sampler2D cloudMap;
  uniform vec3 sunDir;
  uniform float cloudShift;
  uniform float reveal;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vTanW;
  varying vec3 vBitW;
  varying vec3 vPosW;

  void main() {
    vec3 N0 = normalize(vNormalW);
    vec3 nm = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
    nm.xy *= 1.1;
    vec3 N = normalize(mat3(normalize(vTanW), normalize(vBitW), N0) * nm);
    vec3 L = normalize(sunDir);
    vec3 V = normalize(cameraPosition - vPosW);

    float ndl0 = dot(N0, L);
    float ndl = dot(N, L);
    float day = smoothstep(-0.10, 0.28, ndl0);

    vec3 dayCol = texture2D(dayMap, vUv).rgb;
    float ocean = texture2D(oceanMap, vUv).r;
    float cloudShadow = texture2D(cloudMap, vUv + vec2(cloudShift - 0.0012, 0.0006)).r;

    // Oceans read a touch deeper and bluer than the raw map, as they do from orbit.
    dayCol = mix(dayCol, dayCol * vec3(0.62, 0.82, 1.18), ocean * 0.55);

    // Daylight ambient: the far side stays readable against a pale sky.
    vec3 col = dayCol * (max(ndl, 0.0) * 0.95 + 0.14) * (1.0 - cloudShadow * 0.40);

    // Sun glint on water.
    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N0, H), 0.0), 90.0) * 1.4 + pow(max(dot(N0, H), 0.0), 14.0) * 0.12;
    col += vec3(1.0, 0.9, 0.76) * spec * ocean * day * (1.0 - cloudShadow * 0.8);

    // City lights on the night side, warm sodium orange.
    vec3 night = texture2D(nightMap, vUv).rgb;
    night = pow(night, vec3(1.55)) * vec3(1.0, 0.68, 0.36) * 0.9;
    col += night * (1.0 - day) * (1.0 - cloudShadow * 0.65);

    // Atmosphere: haze toward the limb and a bright blue rim on the lit edge.
    float fres = pow(1.0 - max(dot(N0, V), 0.0), 2.4);
    // By day the limb dissolves into the sky's own pale blue.
    vec3 atm = vec3(0.62, 0.78, 1.0);
    float lit = smoothstep(-0.35, 0.55, ndl0);
    col = mix(col, atm * (0.55 + 0.45 * lit), fres * 0.32);
    col += vec3(0.20, 0.32, 0.55) * pow(fres, 2.6) * (0.25 + 0.6 * lit);

    // Its own gentle shoulder instead of global tone mapping, so the photos on
    // the cards keep their colour.
    col = 1.0 - exp(-col * 1.08);
    gl_FragColor = vec4(col, reveal);
    #include <colorspace_fragment>
  }
`;

const cloudVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const cloudFrag = /* glsl */ `
  uniform sampler2D cloudMap;
  uniform vec3 sunDir;
  uniform float cloudShift;
  uniform float reveal;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    float c = texture2D(cloudMap, vUv + vec2(cloudShift, 0.0)).r;
    float a = smoothstep(0.12, 0.85, c);
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vPosW);
    float ndl = dot(N, normalize(sunDir));
    float day = smoothstep(-0.15, 0.35, ndl);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 col = vec3(0.94, 0.96, 1.0) * (max(ndl, 0.0) * 0.82 + 0.12) + vec3(0.25, 0.5, 1.0) * fres * 0.25 * day;
    col = 1.0 - exp(-col * 1.1);
    // The shell sits just above the surface, so at grazing angles it would
    // poke past the limb and draw dark specks over the atmosphere. Fade it out there.
    float edge = smoothstep(0.02, 0.22, dot(N, V));
    gl_FragColor = vec4(col, a * (0.15 + 0.79 * day) * reveal * edge);
    #include <colorspace_fragment>
  }
`;

/**
 * The halo is computed from the view ray's closest approach to the planet's
 * centre rather than from the halo sphere's own normals, so its profile hugs
 * the limb exactly whatever the camera's off-axis lens shift does.
 */
const haloVert = /* glsl */ `
  varying vec3 vPosW;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPosW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const haloFrag = /* glsl */ `
  uniform vec3 sunDir;
  uniform vec3 center;
  uniform float reveal;
  varying vec3 vPosW;
  void main() {
    vec3 rd = normalize(vPosW - cameraPosition);
    vec3 oc = center - cameraPosition;
    float t = dot(oc, rd);
    vec3 closest = cameraPosition + rd * t;
    float b = length(closest - center);
    float h = b - 1.0;
    if (h < 0.0) discard;
    vec3 dir = normalize(closest - center);
    float lit = 0.25 + 0.75 * smoothstep(-0.6, 0.7, dot(dir, normalize(sunDir)));
    float g = exp(-h / 0.012) * 0.60 + exp(-h / 0.05) * 0.20 + exp(-h / 0.18) * 0.06;
    vec3 col = mix(vec3(0.55, 0.72, 1.0), vec3(0.86, 0.92, 1.0), smoothstep(0.0, 0.12, h));
    gl_FragColor = vec4(col, clamp(g * lit, 0.0, 1.0) * reveal);
    #include <colorspace_fragment>
  }
`;

const markerVert = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixel;
  varying float vFace;
  varying float vPulse;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(wp.xyz);
    vFace = smoothstep(0.05, 0.35, dot(n, normalize(cameraPosition - wp.xyz)));
    vPulse = 0.6 + 0.4 * sin(uTime * 1.7 + aPhase * 6.2831);
    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPixel * (3.2 + 1.4 * vPulse);
  }
`;

const markerFrag = /* glsl */ `
  uniform float reveal;
  varying float vFace;
  varying float vPulse;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = dot(p, p);
    if (d > 1.0) discard;
    float core = smoothstep(0.35, 0.0, d);
    float glow = smoothstep(1.0, 0.0, d) * 0.45;
    vec3 col = vec3(0.04, 0.42, 0.40);
    gl_FragColor = vec4(col, clamp(core * 1.2 + glow * 0.5, 0.0, 1.0) * (0.55 + 0.45 * vPulse) * vFace * reveal);
    #include <colorspace_fragment>
  }
`;

const pingVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const pingFrag = /* glsl */ `
  uniform float uT;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float ring = smoothstep(uT - 0.10, uT, r) * smoothstep(uT + 0.02, uT, r);
    float fill = smoothstep(uT, 0.0, r) * 0.10;
    float a = (ring + fill) * pow(1.0 - uT, 1.6);
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor, clamp(a * 1.6, 0.0, 1.0));
    #include <colorspace_fragment>
  }
`;

const shadowFrag = /* glsl */ `
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float a = exp(-dot(p, p) * 3.2) * uOpacity;
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
  }
`;

const starVert = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  uniform float uPixel;
  uniform vec2 uDrift;
  varying float vTw;
  void main() {
    vTw = 0.65 + 0.35 * sin(uTime * (0.6 + aPhase * 1.8) + aPhase * 40.0);
    // Screen-space sky: the earth camera is narrow and lens-shifted, so stars
    // placed in the world would fill only a sliver of the frame.
    vec2 p = position.xy + uDrift;
    p = mod(p + 1.1, 2.2) - 1.1;
    gl_Position = vec4(p, 0.9998, 1.0);
    gl_PointSize = aSize * uPixel;
  }
`;

const starFrag = /* glsl */ `
  uniform float reveal;
  varying float vTw;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float d = dot(p, p);
    if (d > 1.0) discard;
    float a = smoothstep(1.0, 0.0, d);
    a = a * a * vTw * reveal;
    gl_FragColor = vec4(vec3(0.82, 0.88, 1.0) * a, a);
    #include <colorspace_fragment>
  }
`;

const skyVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

/**
 * The daylight sky: a pale, slightly blue top, a warm wash where the sun
 * stands (upper left, matching `sunDir`), and a floor that is exactly the
 * page's paper, so the stage ends without a seam.
 */
const skyFrag = /* glsl */ `
  uniform vec2 uRes;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv;
    // Authored in sRGB, linearised at the end.
    vec3 top = vec3(0.886, 0.925, 0.976);
    vec3 mid = vec3(0.949, 0.957, 0.973);
    vec3 low = vec3(0.976, 0.973, 0.961); // = --color-paper, #f9f8f5
    vec3 col = mix(low, mid, smoothstep(0.0, 0.5, p.y));
    col = mix(col, top, smoothstep(0.5, 1.0, p.y));
    float aspect = uRes.x / uRes.y;
    // The sun's warmth, off to the upper left.
    vec2 q = vec2((p.x - 0.18) * aspect, p.y - 0.95);
    col = mix(col, vec3(1.0, 0.975, 0.935), exp(-dot(q, q) * 2.2) * 0.75);
    // A pale blue scatter rising off the planet's limb.
    vec2 h = vec2((p.x - 0.5) * aspect * 0.55, p.y - 0.30);
    col = mix(col, vec3(0.86, 0.91, 0.985), exp(-dot(h, h) * 6.0) * 0.25);
    // Dither, so the long gradient does not band on 8-bit panels.
    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += (n - 0.5) / 255.0;
    col = pow(max(col, 0.0), vec3(2.2));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/* -------------------------------------------------------------------------- */
/* Construction                                                               */
/* -------------------------------------------------------------------------- */

export type EarthTextures = {
  day: THREE.Texture;
  night: THREE.Texture;
  ocean: THREE.Texture;
  normal: THREE.Texture;
  clouds: THREE.Texture;
};

export function createEarth(textures: EarthTextures, countries: { lat: number; lng: number }[]) {
  const scene = new THREE.Scene();

  // From the upper left and in front: by day most of the visible cap is lit,
  // with only a soft terminator along the planet's right shoulder.
  const sunDir = new THREE.Vector3(-0.55, 0.5, 0.75).normalize();

  /* Sky. */
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    uniforms: { uRes: { value: new THREE.Vector2(1, 1) } },
    depthWrite: false,
    depthTest: false,
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  scene.add(sky);

  /* Stars. */
  const STAR_COUNT = 1100;
  const starPos = new Float32Array(STAR_COUNT * 3);
  const starSize = new Float32Array(STAR_COUNT);
  const starPhase = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    starPos.set([Math.random() * 2.2 - 1.1, Math.random() * 2.2 - 1.1, 0], i * 3);
    const r = Math.random();
    starSize[i] = r < 0.92 ? 0.8 + Math.random() * 1.2 : 2.2 + Math.random() * 1.8;
    starPhase[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(starSize, 1));
  starGeo.setAttribute("aPhase", new THREE.BufferAttribute(starPhase, 1));
  const starMat = new THREE.ShaderMaterial({
    vertexShader: starVert,
    fragmentShader: starFrag,
    uniforms: {
      uTime: { value: 0 },
      uPixel: { value: 1 },
      uDrift: { value: new THREE.Vector2() },
      reveal: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  stars.renderOrder = -5;
  // Kept in the scene graph (the engine drives its uniforms), but not drawn by day.
  stars.visible = false;
  scene.add(stars);

  /* The globe. Everything that turns with the planet lives under `globe`. */
  const globe = new THREE.Group();
  scene.add(globe);

  const earthMat = new THREE.ShaderMaterial({
    vertexShader: earthVert,
    fragmentShader: earthFrag,
    uniforms: {
      dayMap: { value: textures.day },
      nightMap: { value: textures.night },
      oceanMap: { value: textures.ocean },
      normalMap: { value: textures.normal },
      cloudMap: { value: textures.clouds },
      sunDir: { value: sunDir },
      cloudShift: { value: 0 },
      reveal: { value: 0 },
    },
    // It fades in by opacity: on a pale sky, fading up from black would flash a dark disc.
    transparent: true,
  });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 256, 160), earthMat);
  globe.add(earth);

  const cloudMat = new THREE.ShaderMaterial({
    vertexShader: cloudVert,
    fragmentShader: cloudFrag,
    uniforms: {
      cloudMap: { value: textures.clouds },
      sunDir: { value: sunDir },
      cloudShift: { value: 0 },
      reveal: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.006, 192, 128), cloudMat);
  clouds.renderOrder = 2;
  globe.add(clouds);

  const haloMat = new THREE.ShaderMaterial({
    vertexShader: haloVert,
    fragmentShader: haloFrag,
    uniforms: {
      sunDir: { value: sunDir },
      center: { value: new THREE.Vector3() },
      reveal: { value: 0 },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.7, 128, 96), haloMat);
  halo.renderOrder = 1;
  scene.add(halo);

  /* Every destination as a small radar dot, the way Ascend marks its cities. */
  const mPos = new Float32Array(countries.length * 3);
  const mPhase = new Float32Array(countries.length);
  countries.forEach((c, i) => {
    const v = latLngToVec(c.lat, c.lng, 1.0025);
    mPos.set([v.x, v.y, v.z], i * 3);
    mPhase[i] = Math.random();
  });
  const markerGeo = new THREE.BufferGeometry();
  markerGeo.setAttribute("position", new THREE.BufferAttribute(mPos, 3));
  markerGeo.setAttribute("aPhase", new THREE.BufferAttribute(mPhase, 1));
  const markerMat = new THREE.ShaderMaterial({
    vertexShader: markerVert,
    fragmentShader: markerFrag,
    uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, reveal: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const markers = new THREE.Points(markerGeo, markerMat);
  markers.renderOrder = 3;
  globe.add(markers);

  /* Lights, for the pin only — the planet is lit in its own shader. */
  const sunLight = new THREE.DirectionalLight(0xfff2e0, 2.4);
  sunLight.position.copy(sunDir).multiplyScalar(10);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0x8fa8ff, 0.35));
  const rim = new THREE.DirectionalLight(0x7fb2ff, 1.2);
  rim.position.set(0.8, 0.3, -0.6).multiplyScalar(10);
  scene.add(rim);

  /* ---------------------------------------------------------------------- */
  /* The pin: a 📍 made solid. Glossy red head, steel needle, soft shadow.   */
  /* Built at a unit head radius and scaled to a constant on-screen size.    */
  /* ---------------------------------------------------------------------- */
  const pin = new THREE.Group();
  pin.renderOrder = 5;
  const pinBody = new THREE.Group();
  pin.add(pinBody);

  const NEEDLE = 3.1;
  const needle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.025, NEEDLE, 20, 1),
    new THREE.MeshStandardMaterial({ color: 0xd9dee6, metalness: 1, roughness: 0.22 }),
  );
  needle.position.y = NEEDLE / 2;
  pinBody.add(needle);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.16, 0.5, 24),
    new THREE.MeshPhysicalMaterial({ color: 0xc8121e, roughness: 0.3, clearcoat: 1 }),
  );
  collar.position.y = NEEDLE + 0.05;
  pinBody.add(collar);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0xe3202b,
      roughness: 0.16,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      sheen: 0.4,
      sheenColor: new THREE.Color(0xff6b6b),
    }),
  );
  head.position.y = NEEDLE + 0.85;
  pinBody.add(head);

  pin.traverse((o) => {
    o.renderOrder = 5;
  });

  // The shadow and the pings lie on the ground, so they live in a group
  // aligned to the surface normal rather than to the pin's upright lean.
  const ground = new THREE.Group();
  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: pingVert,
    fragmentShader: shadowFrag,
    uniforms: { uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = 4;
  ground.add(shadow);

  const pings = [0, 1, 2].map(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: pingVert,
      fragmentShader: pingFrag,
      uniforms: { uT: { value: 1 }, uColor: { value: new THREE.Color(0.86, 0.16, 0.2) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 4;
    ground.add(m);
    return m;
  });

  scene.add(ground);
  scene.add(pin);

  return {
    scene,
    globe,
    sunDir,
    skyMat,
    starMat,
    earthMat,
    cloudMat,
    haloMat,
    markerMat,
    markers,
    pin,
    pinBody,
    ground,
    shadow,
    shadowMat,
    pings,
    clouds,
    dispose() {
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
    },
  };
}

export type Earth = ReturnType<typeof createEarth>;
