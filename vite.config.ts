import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { networkInterfaces } from "node:os";

/**
 * Find this computer's address on the local Wi-Fi/Ethernet so the kiosk QR code
 * works when the kiosk itself is opened at http://localhost (a phone can't reach
 * "localhost" — that would point at the phone).
 * Skips link-local 169.254.x.x and virtual adapters (WSL, Hyper-V, VirtualBox, VMware, Docker).
 */
function lanAddress(): string | null {
  const virtual = /vethernet|virtualbox|vmware|wsl|hyper-v|docker|loopback|vbox|tailscale|zerotier/i;
  const candidates: { ip: string; rank: number }[] = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    if (!addrs || virtual.test(name)) continue;
    for (const a of addrs) {
      if (a.family !== "IPv4" || a.internal) continue;
      const ip = a.address;
      if (ip.startsWith("169.254.")) continue;
      const rank = ip.startsWith("192.168.") ? 0 : ip.startsWith("10.") ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ? 2 : 3;
      candidates.push({ ip, rank: rank + (/wi-?fi|wlan|wireless/i.test(name) ? 0 : 0.5) });
    }
  }
  candidates.sort((a, b) => a.rank - b.rank);
  return candidates[0]?.ip ?? null;
}

const LAN_IP = lanAddress();

/** Print the address to open the kiosk at, so the QR is scannable from a phone. */
function phoneHint(): Plugin {
  return {
    name: "phone-hint",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        setTimeout(() => {
          const addr = server.httpServer?.address();
          const port = typeof addr === "object" && addr ? addr.port : server.config.server.port;
          if (!LAN_IP) return;
          console.log(
            `\n  \x1b[32m📱 Kiosk for QR scanning:\x1b[0m  \x1b[36mhttp://${LAN_IP}:${port}/kiosk\x1b[0m` +
              `\n     Phone must be on the same Wi-Fi. (Opening at localhost also works — the QR uses this address automatically.)\n`,
          );
        }, 50);
      });
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), phoneHint()],
  define: {
    // Only meaningful for the local dev server; production uses the real domain.
    __LAN_IP__: JSON.stringify(command === "serve" ? LAN_IP : null),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          motion: ["framer-motion"],
        },
      },
    },
  },
}));
