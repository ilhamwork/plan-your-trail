import { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/invoice", "/invoice/"],
    },
    sitemap: "https://planyourtrail.run/sitemap.xml",
  }
}
