import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config, { isServer }) {
    if (!isServer) {
      // PDF.js's unminified bundle reuses Webpack runtime variable names,
      // which collide with Next's eval source maps. Use its official minified
      // build of the same installed version; the worker import is unchanged.
      config.resolve.alias = {
        ...config.resolve.alias,
        "pdfjs-dist$": "pdfjs-dist/build/pdf.min.mjs",
      };
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
