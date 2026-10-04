import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "base-attribution-os.vercel.app" }],
        destination: "https://www.baosys.xyz/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
