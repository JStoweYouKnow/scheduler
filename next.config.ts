import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // YAML is loaded at runtime via readdir/readFile; NFT often misses it.
  outputFileTracingIncludes: {
    "/*": ["./config/**/*"],
  },
};

export default nextConfig;
