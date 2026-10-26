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
        "warn",
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
]);

export default eslintConfig;

