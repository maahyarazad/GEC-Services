import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env': {},
    global: 'window',
  },
  optimizeDeps: {
    include: ['buffer', 'process'],
  },
  server: {
    port: 5175, // 👈 your custom port
    // proxy: {
    //   "/api": {
    //     target: "https://open.er-api.com",
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, ""),
    //   },
    // },
  },
});
