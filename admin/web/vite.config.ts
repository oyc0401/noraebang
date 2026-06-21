import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(__dirname),
  base: "/admin",
  build: {
    outDir: resolve(__dirname, "../public/admin"),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/parser": "http://localhost:3002",
    },
  },
});
