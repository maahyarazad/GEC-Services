import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    //visualizer({ open: true }),
    react({
    jsxRuntime: "automatic",
  }),
    splitVendorChunkPlugin(), // helps code-splitting vendor libs
 
  ],
  define: {
    global: "window",
  },
  optimizeDeps: {
    include: ["buffer", "process"],
  },
  build: {
    // sourcemap: true, // no need for source maps in production
    // minify: "terser", // smaller output than default esbuild
    // chunkSizeWarningLimit: 800, // raise the warning limit
    rollupOptions: {
      // output: {
      //   manualChunks(id) {
      //     // Split major vendor libs into separate chunks
      //     if (id.includes("node_modules")) {
      //       if (id.includes("react")) return "vendor-react";
      //       if (id.includes("prime")) return "vendor-prime";
      //       if (id.includes("mui")) return "vendor-mui";
      //       if (id.includes("chart")) return "vendor-chart";
      //       return "vendor";
      //     }
      //   },
      // },
      external: ["mapbox-gl"],
    },
  },
  server: {
    port: 5175,
  },
}));
