import { prisma } from "@/lib/prisma";

export type HomeSlide = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  badge: string;
  stats: string[];
  image: string;
  link: string;
  sortOrder: number;
  isActive: boolean;
};

const DEFAULT_HOME_SLIDES: Array<Omit<HomeSlide, "id">> = [
  {
    title: "Wholesale Ordering, Reimagined",
    subtitle: "Built for Fast-Moving Businesses",
    description: "Source trusted products at scale with predictable pricing, quick support, and reliable nationwide delivery.",
    cta: "Browse Products",
    badge: "Popular with retailers",
    stats: ["500+ active business buyers", "24-48 hr dispatch", "KES 50,000 free-delivery threshold"],
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&q=80",
    link: "/products",
    sortOrder: 1,
    isActive: true,
  },
  {
    title: "Delivery You Can Plan Around",
    subtitle: "Nationwide Logistics Network",
    description: "From Nairobi to regional hubs, Eterna keeps your stock moving with clear timelines and consistent handoff.",
    cta: "Get Quote",
    badge: "Operations-friendly",
    stats: ["Live order coordination", "Scheduled drop-offs", "Dedicated support line"],
    image: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1920&q=80",
    link: "/quote",
    sortOrder: 2,
    isActive: true,
  },
  {
    title: "Quality Standards, Not Guesswork",
    subtitle: "Curated for Consistency",
    description: "Every category is selected for dependable quality so your shelves, kitchens, and teams stay fully supplied.",
    cta: "Explore Categories",
    badge: "Procurement-ready",
    stats: ["Verified supplier chain", "Transparent category mix", "Reliable replenishment"],
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=80",
    link: "/categories",
    sortOrder: 3,
    isActive: true,
  },
];

export async function ensureHomeSlidesTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS site_home_slides (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      description TEXT NOT NULL,
      cta TEXT NOT NULL,
      badge TEXT NOT NULL,
      stats TEXT NOT NULL,
      image TEXT NOT NULL,
      link TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function seedDefaultHomeSlidesIfEmpty() {
  await ensureHomeSlidesTable();

  const existing = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int as count FROM site_home_slides;`
  );

  if ((existing[0]?.count ?? 0) > 0) {
    return;
  }

  for (const slide of DEFAULT_HOME_SLIDES) {
    const id = `home_${slide.sortOrder}`;
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO site_home_slides (
          id, title, subtitle, description, cta, badge, stats, image, link, sort_order, is_active, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW());
      `,
      id,
      slide.title,
      slide.subtitle,
      slide.description,
      slide.cta,
      slide.badge,
      JSON.stringify(slide.stats),
      slide.image,
      slide.link,
      slide.sortOrder,
      slide.isActive
    );
  }
}

export async function listHomeSlides(): Promise<HomeSlide[]> {
  await seedDefaultHomeSlidesIfEmpty();

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    title: string;
    subtitle: string;
    description: string;
    cta: string;
    badge: string;
    stats: string;
    image: string;
    link: string;
    sortOrder: number;
    isActive: boolean;
  }>>(`
    SELECT
      id,
      title,
      subtitle,
      description,
      cta,
      badge,
      stats,
      image,
      link,
      sort_order as "sortOrder",
      is_active as "isActive"
    FROM site_home_slides
    ORDER BY sort_order ASC;
  `);

  return rows.map((row) => ({
    ...row,
    stats: JSON.parse(row.stats || "[]") as string[],
  }));
}

export async function saveHomeSlides(slides: HomeSlide[]) {
  await ensureHomeSlidesTable();

  for (const slide of slides) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO site_home_slides (
          id, title, subtitle, description, cta, badge, stats, image, link, sort_order, is_active, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          description = EXCLUDED.description,
          cta = EXCLUDED.cta,
          badge = EXCLUDED.badge,
          stats = EXCLUDED.stats,
          image = EXCLUDED.image,
          link = EXCLUDED.link,
          sort_order = EXCLUDED.sort_order,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
      `,
      slide.id,
      slide.title,
      slide.subtitle,
      slide.description,
      slide.cta,
      slide.badge,
      JSON.stringify(slide.stats),
      slide.image,
      slide.link,
      slide.sortOrder,
      slide.isActive
    );
  }
}
