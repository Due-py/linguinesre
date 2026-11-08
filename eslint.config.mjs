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
    // Mã đã dịch sẵn của bên thứ ba (RNNoise WebAssembly worklet), chép từ node_modules.
    "public/noise/rnnoise-worklet.js",
  ]),
]);

export default eslintConfig;
