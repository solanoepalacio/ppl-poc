import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Preset product catalog for the PoC. The catalog is seed-only (no management
 * UI). To retire a product, set `active: false` rather than deleting it so
 * historical order items keep their reference.
 */
const CATALOG: { name: string }[] = [
  { name: 'Medialunas (dozen)' },
  { name: 'Croissant' },
  { name: 'Pan de campo (loaf)' },
  { name: 'Baguette' },
  { name: 'Factura surtida (dozen)' },
  { name: 'Chipá (dozen)' },
  { name: 'Torta de chocolate' },
  { name: 'Pan dulce' },
];

async function main() {
  for (const product of CATALOG) {
    // Idempotent on name so re-seeding doesn't duplicate the catalog.
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: { active: true },
      });
    } else {
      await prisma.product.create({ data: { name: product.name, active: true } });
    }
  }
  const count = await prisma.product.count();
  console.log(`Seed complete: ${count} products in catalog.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
