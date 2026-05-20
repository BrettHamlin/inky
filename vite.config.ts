import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/inky/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "happy-dom",
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
