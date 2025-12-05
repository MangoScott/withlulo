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
  ]),
  {
    rules: {
      // Allow refs in render for initialization patterns
      "react-hooks/refs": "off",
      // Allow setState in effects for initialization
      "react-hooks/set-state-in-effect": "off",
      // Allow unescaped entities
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
