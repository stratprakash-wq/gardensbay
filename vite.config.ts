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

/**
 * Replace Vite's URL list with just two lines: the local URL, and the one
 * Wi-Fi address phones can reach (the one the kiosk QR code uses).
 * Link-local (169.254.x.x) and virtual-adapter addresses are left out.
 */
function phoneHint(): Plugin {
  return {
    name: "phone-hint",
    configureServer(server) {
      server.printUrls = () => {
        const local = server.resolvedUrls?.local[0] ?? `http://localhost:${server.config.server.port}/`;
        const port = new URL(local).port;
        const g = (t: string) => `\x1b[32m${t}\x1b[0m`;
        const c = (t: string) => `\x1b[36m${t}\x1b[0m`;
        const lines = [`  ${g("➜")}  Local:    ${c(local)}`];
        if (LAN_IP) {
          lines.push(
            `  ${g("➜")}  Network:  ${c(`http://${LAN_IP}:${port}/`)}  ${g("← use this one for the QR code")}`,
            `  ${g("📱")} Kiosk:    ${c(`http://${LAN_IP}:${port}/kiosk`)}`,
            `     Phones must be on the same Wi-Fi. Opening the kiosk at localhost also works — its QR uses ${LAN_IP} automatically.`,
          );
        } else {
          lines.push(`  ${g("➜")}  Network:  no Wi-Fi/LAN address found — phones won't be able to scan the QR code.`);
        }
        console.log(lines.join("\n") + "\n");
      };
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
