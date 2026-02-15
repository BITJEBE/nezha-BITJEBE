import react from "@vitejs/plugin-react-swc"
import { execSync } from "child_process"
import path from "path"
import { UserConfig, defineConfig } from "vite"
import dotenv from "dotenv";
import * as fs from "fs";


// Get git commit hash
const getGitHash = () => {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim()
  } catch (e) {
    console.log(e)
    return "unknown"
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const baseConfig: UserConfig = {
    base: "/",
    define: {
      "import.meta.env.VITE_GIT_HASH": JSON.stringify(getGitHash()),
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    build: {
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name].[hash].js`,
          chunkFileNames: `assets/[name].[hash].js`,
          assetFileNames: `assets/[name].[hash].[ext]`,
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return id.toString().split("node_modules/")[1].split("/")[0].toString()
            }
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },
  }


  if (mode === "development") {
    const envPath = path.resolve(process.cwd(), ".env.development");
    if (fs.existsSync(envPath)) {
      const envConfig = dotenv.parse(fs.readFileSync(envPath));
      for (const k in envConfig) {
        process.env[k] = envConfig[k];
      }
    }
    if (!process.env.VITE_API_TARGET) {
      process.env.VITE_API_TARGET = "http://127.0.0.1:8008";
    }
    baseConfig.server = {
      proxy: {
        "/api/rpc2": {
          target: process.env.VITE_API_TARGET,
          changeOrigin: true,
          ws: true,
          rewriteWsOrigin: true,
        },
        "/favicon.ico": {
          target: process.env.VITE_API_TARGET,
          changeOrigin: true,
        },
      },
    }
  }
  return baseConfig
})
