import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // The OCR engine, placed here by `scripts/setup-tesseract.mjs`. Minified
    // third-party code we neither wrote nor can fix: linting it produced 11
    // errors and 587 warnings in files that are not ours, which is how a lint
    // run stops being read at all.
    "public/tesseract/**",
  ]),
]);

export default eslintConfig;
