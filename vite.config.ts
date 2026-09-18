import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";

export default defineConfig({
  plugins: [
    // The storefront has one ISR route (`/blog`, revalidate 3600) and a Worker
    // has no persistent filesystem to revalidate into, so the cache lives in KV
    // (binding VINEXT_KV_CACHE, declared in wrangler.jsonc).
    vinext({
      prerender: { routes: "*" },
      cache: {
        data: kvDataAdapter(),
      },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
