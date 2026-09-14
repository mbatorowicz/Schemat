import { defineConfig, loadEnv } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  if (env.AI_GATEWAY_API_KEY && !process.env.AI_GATEWAY_API_KEY) {
    process.env.AI_GATEWAY_API_KEY = env.AI_GATEWAY_API_KEY;
  }
  if (env.VERCEL_OIDC_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
    process.env.VERCEL_OIDC_TOKEN = env.VERCEL_OIDC_TOKEN;
  }

  return {
    root: __dirname,
    server: {
      port: 5173,
      fs: { allow: [__dirname] },
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = (req.url || "").split("?")[0];
          if (url !== "/api/assistant") return next();
          try {
            const { default: handler } = await import("./api/assistant.js");
            await handler(req, res);
          } catch (e) {
            if (res.headersSent) return;
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: String(e?.message || e) }));
          }
        });
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
