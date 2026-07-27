import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@35mm/types", "@35mm/validators"],
  env: {
    NEXT_PUBLIC_APP_VERSION:
      process.env.VERCEL_GIT_COMMIT_SHA ??
      process.env.GIT_SHA ??
      Date.now().toString(),
  },
  async redirects() {
    return [
      {
        source: "/profile/:username",
        destination: "/:username",
        permanent: true,
      },
      { source: "/for-you", destination: "/", permanent: true },
      { source: "/drafts", destination: "/", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
      {
        protocol: "https",
        hostname: "static0.colliderimages.com",
        pathname: "/wordpress/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "cdn.theplaylist.net",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "filmfreeway-production-storage-01-connector.filmfreeway.com",
        pathname: "/attachments/**",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/api/portraits/**",
      },
    ],
  },
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    config.module.noParse =
      /[\\/]nsfwjs[\\/]dist[\\/]models[\\/].+\.min\.js$/;
    return config;
  },
};

export default nextConfig;
