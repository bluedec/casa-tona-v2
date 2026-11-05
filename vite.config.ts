import netlify from '@netlify/vite-plugin'; 
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import { solidStart } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    solidStart(),
    netlify({ build: { enabled: true } }),
    tailwindcss(),
    nitro()
  ]
});
