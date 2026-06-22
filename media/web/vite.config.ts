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
    port: 5175,
    proxy: {
      "/api": "http://localhost:3003",
    },
  },
});
