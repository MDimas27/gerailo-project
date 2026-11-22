import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Monorepo: VITE_* publik dibaca dari .env di root repo, bukan apps/web.
  envDir: "../../",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Gerailo",
        short_name: "Gerailo",
        description: "Catat order WhatsApp jadi pembukuan usaha.",
        lang: "id",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#F7F8FA",
        theme_color: "#0F766E",
        share_target: {
          action: "/share",
          method: "GET",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
