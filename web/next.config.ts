import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  // Protótipos da Fase 6c foram removidos; o formato novo está na própria aba Inflação.
  async redirects() {
    return [{ source: "/prototipos/:modelo*", destination: "/aba/inflacao", permanent: false }];
  },
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    }];
  },
};
export default config;
