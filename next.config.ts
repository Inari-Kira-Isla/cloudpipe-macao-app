import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Old flat URLs → new industry-prefixed URLs (301 permanent)
    const categoryToIndustry: Record<string, string> = {
      restaurant: 'dining',
      japanese: 'dining',
      portuguese: 'dining',
      cafe: 'dining',
      bar: 'dining',
      bakery: 'dining',
      'food-import': 'food-trade',
      'food-delivery': 'food-trade',
      hotel: 'hospitality',
      entertainment: 'hospitality',
      retail: 'lifestyle',
      beauty: 'lifestyle',
      education: 'services',
      professional: 'services',
      tech: 'services',
      tourism: 'tourism',
    }

    const redirects = []
    for (const [cat, ind] of Object.entries(categoryToIndustry)) {
      // /macao/japanese → /macao/dining/japanese
      redirects.push({
        source: `/macao/${cat}`,
        destination: `/macao/${ind}/${cat}`,
        permanent: true,
      })
      // /macao/japanese/:slug → /macao/dining/japanese/:slug
      redirects.push({
        source: `/macao/${cat}/:slug`,
        destination: `/macao/${ind}/${cat}/:slug`,
        permanent: true,
      })
    }
    return redirects
  },
};

export default nextConfig;
