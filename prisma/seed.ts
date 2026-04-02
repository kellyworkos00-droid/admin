import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Upsert user by email
  const user = await prisma.user.upsert({
    where: { email: "demo-seller@example.com" },
    update: {},
    create: {
      fullName: "Demo Seller",
      email: "demo-seller@example.com",
      phone: "0700000000",
      passwordHash: "demo1234", // Set a real hash in production
      role: "CUSTOMER",
    },
  });

  // Upsert seller by userId
  const seller = await prisma.seller.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      businessName: "Demo Seller Ltd.",
      businessType: "Groceries",
      phone: "0700000000",
      email: "demo-seller@example.com",
      address: "Nairobi, Kenya",
      logo: "",
      status: "VERIFIED",
      subscriptionTier: "FREE",
      subscriptionStatus: "ACTIVE",
      rating: 5,
      totalOrders: 0,
    },
  });

  // Seed products
  const products = [
    {
      sku: "PRD-001",
      name: "Premium Rice (50kg Bag)",
      slug: "premium-rice-50kg",
      description: "High quality rice for bulk buyers.",
      category: "Groceries",
      imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=900&q=80",
      price: 4500,
      bulkPrice: 4200,
      minOrder: 10,
      stockQty: 100,
      discountPct: 15,
      isActive: true,
    },
    {
      sku: "PRD-002",
      name: "Cooking Oil (20L Jerry Can)",
      slug: "cooking-oil-20l",
      description: "Pure vegetable oil for cooking.",
      category: "Groceries",
      imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=900&q=80",
      price: 3200,
      bulkPrice: 2950,
      minOrder: 20,
      stockQty: 80,
      discountPct: 10,
      isActive: true,
    },
    {
      sku: "PRD-003",
      name: "Maize Flour (90kg Bag)",
      slug: "maize-flour-90kg",
      description: "Finely milled maize flour.",
      category: "Groceries",
      imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=900&q=80",
      price: 5800,
      bulkPrice: 5400,
      minOrder: 15,
      stockQty: 60,
      discountPct: 12,
      isActive: true,
    },
    {
      sku: "PRD-004",
      name: "Detergent Powder (25kg)",
      slug: "detergent-powder-25kg",
      description: "Powerful cleaning detergent.",
      category: "Home & Living",
      imageUrl: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=900&q=80",
      price: 2800,
      bulkPrice: 2500,
      minOrder: 30,
      stockQty: 40,
      discountPct: 20,
      isActive: true,
    },
    {
      sku: "PRD-005",
      name: "Sugar (50kg Bag)",
      slug: "sugar-50kg",
      description: "Refined sugar for all uses.",
      category: "Groceries",
      imageUrl: "https://images.unsplash.com/photo-1587735243574-7c28a5c525e5?w=900&q=80",
      price: 6500,
      bulkPrice: 6100,
      minOrder: 10,
      stockQty: 70,
      discountPct: 8,
      isActive: true,
    },
    {
      sku: "PRD-006",
      name: "Wheat Flour (50kg)",
      slug: "wheat-flour-50kg",
      description: "Premium wheat flour.",
      category: "Groceries",
      imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=900&q=80",
      price: 4800,
      bulkPrice: 4500,
      minOrder: 20,
      stockQty: 50,
      discountPct: 15,
      isActive: true,
    },
    {
      sku: "PRD-007",
      name: "Tissue Paper (Pack of 100)",
      slug: "tissue-paper-100",
      description: "Bulk tissue paper pack.",
      category: "Home & Living",
      imageUrl: "https://images.unsplash.com/photo-1584736286279-4af932d3e4d1?w=900&q=80",
      price: 1800,
      bulkPrice: 1600,
      minOrder: 50,
      stockQty: 30,
      discountPct: 18,
      isActive: true,
    },
    {
      sku: "PRD-008",
      name: "Hand Sanitizer (5L)",
      slug: "hand-sanitizer-5l",
      description: "Alcohol-based sanitizer.",
      category: "Health & Beauty",
      imageUrl: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=900&q=80",
      price: 3500,
      bulkPrice: 3200,
      minOrder: 25,
      stockQty: 25,
      discountPct: 12,
      isActive: true,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: product,
      create: {
        ...product,
        sellerId: seller.id,
      },
    });
  }

  console.log("Seeded demo seller and products.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
