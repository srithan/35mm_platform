import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/settings", "/notifications"],
      },
    ],
    sitemap: "https://35mm.in/sitemap.xml",
  };
}
