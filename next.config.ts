import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Keeps the dev badge out of the screenshots used for the UI deliverable.
  devIndicators: false,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
