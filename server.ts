import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Robust path-based proxy for games
  app.use("/api/proxy/:protocol/:host/*", (req, res, next) => {
    const { protocol, host } = req.params;
    const path = req.params[0] || "";
    const targetUrl = `${protocol}://${host}/${path}${req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""}`;

    return createProxyMiddleware({
      target: `${protocol}://${host}`,
      changeOrigin: true,
      pathRewrite: (currentPath) => {
        // req.params[0] contains the path part of our proxy URL
        const actualPath = req.params[0] || "";
        // Prepend a slash if it doesn't have one
        return actualPath.startsWith("/") ? actualPath : `/${actualPath}`;
      },
      onProxyRes: (proxyRes) => {
        delete proxyRes.headers["x-frame-options"];
        delete proxyRes.headers["content-security-policy"];
        proxyRes.headers["access-control-allow-origin"] = "*";
      },
      onError: (err, req, res) => {
        console.error("Proxy error:", err);
        res.status(500).send("Proxy error: " + err.message);
      }
    })(req, res, next);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
