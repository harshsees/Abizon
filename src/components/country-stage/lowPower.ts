/**
 * Its own module, free of three.js, so the page can ask before it decides
 * whether to fetch the engine at all.
 */

/**
 * True when WebGL would be drawn by the CPU: no GPU, a blocklisted driver, a
 * VM, or a headless browser (which is what PageSpeed measures with). There,
 * every frame of this scene is hundreds of milliseconds of main-thread work
 * and starting it is seconds more, so the page waits for the visitor to reach
 * for the hall before starting it, and the engine then draws only when
 * something has changed instead of 60 times a second.
 * `failIfMajorPerformanceCaveat` is the browser's own answer to the
 * question; the renderer name catches the software rasterisers it lets through.
 */
export function detectLowPower(): boolean {
  try {
    const probe = document.createElement("canvas");
    const opts = { failIfMajorPerformanceCaveat: true };
    const gl = (probe.getContext("webgl2", opts) ?? probe.getContext("webgl", opts)) as
      | WebGLRenderingContext
      | null;
    if (!gl) return true;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch {
    return true;
  }
}
