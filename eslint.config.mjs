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
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "Supabase JS client is deprecated. Use Drizzle + lib/db instead.",
            },
            {
              name: "@supabase/ssr",
              message: "Do not use @supabase/ssr.",
            },
            {
              name: "@vercel/kv",
              message: "Do not use @vercel/kv. Use Postgres instead.",
            },
            {
              name: "@vercel/postgres",
              message: "Do not use @vercel/postgres. Use Drizzle + lib/db instead.",
            },
            {
              name: "@vercel/blob",
              message: "Do not use @vercel/blob. Use Cloudflare R2 via lib/storage instead.",
            },
            {
              name: "@vercel/edge-config",
              message: "Do not use @vercel/edge-config.",
            },
          ],
        },
      ],
    },
  },
  // Audited legacy files per PRD Section 9.7 & IMPLEMENTATION_PLAN.md line 87:
  // Legacy files allowed with warning until migrated in their respective epics.
  {
    files: ["lib/supabase.ts", "app/invoice/**"],
    rules: {
      "no-restricted-imports": "warn",
    },
  },
]);

export default eslintConfig;

