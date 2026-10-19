import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { ALL } from '@/lib/pairs';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 },
    ...ALL.map((p) => ({ url: `${SITE_URL}/meeting/${p.slug}`, changeFrequency: 'yearly' as const, priority: 0.7 })),
  ];
}
