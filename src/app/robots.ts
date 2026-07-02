import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
    if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    return "http://localhost:3000";
  };

  const baseUrl = getBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/sign-in", "/sign-up"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
