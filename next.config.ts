import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // The default bottom-left indicator sits on top of the theme switch in the
  // sidebar footer.
  devIndicators: {
    position: "bottom-right",
  },
  // YAML is loaded at runtime via readdir/readFile; NFT often misses it.
  outputFileTracingIncludes: {
    "/*": ["./config/**/*"],
  },
};

export default nextConfig;
