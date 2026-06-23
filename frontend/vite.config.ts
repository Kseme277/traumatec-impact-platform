import { defineConfig, type ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

const clerkFrontendApi =
  process.env.VITE_CLERK_FRONTEND_API_URL ?? "https://humane-deer-24.clerk.accounts.dev";

const isDockerDev = process.env.VITE_DOCKER_DEV === "true";

/** Hôte machine (npm run dev hors Docker) ou noms de service Compose. */
const serviceHostByPort: Record<number, string> = {
  8001: isDockerDev ? "identity" : (process.env.VITE_API_SERVICE_HOST ?? "127.0.0.1"),
  8002: isDockerDev ? "events" : (process.env.VITE_API_SERVICE_HOST ?? "127.0.0.1"),
  8003: isDockerDev ? "catalog" : (process.env.VITE_API_SERVICE_HOST ?? "127.0.0.1"),
  8004: isDockerDev ? "docgen" : (process.env.VITE_API_SERVICE_HOST ?? "127.0.0.1"),
  8005: isDockerDev ? "analytics" : (process.env.VITE_API_SERVICE_HOST ?? "127.0.0.1"),
};

function proxyTo(port: number, extra?: Partial<ProxyOptions>): ProxyOptions {
  return {
    target: `http://${serviceHostByPort[port]}:${port}`,
    changeOrigin: true,
    ...extra,
  };
}

/** Routage identique à nginx — fonctionne sans conteneur nginx sur :8080. */
function directApiProxies(): Record<string, ProxyOptions> {
  return {
    "/api/v1/generations": proxyTo(8004, { timeout: 300_000 }),
    "/api/v1/workflow": proxyTo(8004, { timeout: 300_000 }),
    "/api/v1/certificates": proxyTo(8004, { timeout: 300_000 }),
    "/api/v1/analytics": proxyTo(8005),
    "/api/v1/parcours": proxyTo(8003),
    "/api/v1/packages": proxyTo(8003, { timeout: 600_000 }),
    "/api/v1/profiles": proxyTo(8003),
    "/api/v1/templates": proxyTo(8003),
    "/api/v1/certificate-sets": proxyTo(8003),
    "/api/v1/imports": proxyTo(8002, { timeout: 600_000 }),
    "/api/v1/events": proxyTo(8002),
    "/api/v1/teachers": proxyTo(8002),
    "/api/v1/national-contacts": proxyTo(8002),
    "/api/v1/participants": proxyTo(8002, { timeout: 600_000 }),
    "/api/v1/users": proxyTo(8001),
    "/api/v1/auth": proxyTo(8001),
    "/api/v1/audit": proxyTo(8001),
    "/api/v1/guides": proxyTo(8001),
    "/api/v1/notifications": proxyTo(8001),
    "/api/users": proxyTo(8001),
    "/api/admin": proxyTo(8001),
    "/api/webhooks": proxyTo(8001),
  };
}

function gatewayApiProxy(target: string): Record<string, ProxyOptions> {
  return {
    "/api": {
      target,
      changeOrigin: true,
      configure: (proxy) => {
        proxy.on("proxyReq", (proxyReq, req) => {
          const host = req.headers.host;
          if (host) {
            proxyReq.setHeader("Host", host);
          }
        });
        proxy.on("proxyRes", (proxyRes, req) => {
          const location = proxyRes.headers.location;
          if (location?.includes("://nginx")) {
            const host = req.headers.host ?? "localhost:5173";
            const protocol = req.headers["x-forwarded-proto"] ?? "http";
            proxyRes.headers.location = location.replace(
              /^https?:\/\/nginx(?::\d+)?/,
              `${protocol}://${host}`,
            );
          }
        });
      },
    },
  };
}

const proxyMode = process.env.VITE_API_PROXY_TARGET ?? "direct";
const apiProxies =
  proxyMode === "direct" ? directApiProxies() : gatewayApiProxy(proxyMode);

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/onlyoffice": {
        target: isDockerDev
          ? "http://onlyoffice:80"
          : (process.env.VITE_ONLYOFFICE_URL ?? "http://127.0.0.1:9980"),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/onlyoffice/, ""),
      },
      "/__clerk": {
        target: clerkFrontendApi,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/__clerk/, ""),
      },
      ...apiProxies,
    },
  },
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  optimizeDeps: {
    include: ["country-state-city"],
  },
});
