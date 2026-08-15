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
      // Pervasive pre-existing convention – warn instead of error.
      "@typescript-eslint/no-explicit-any": "warn",
      // shadcn sidebar uses Math.random in useMemo – pre-existing.
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
