import { PrismaClient } from '@prisma/client';
import type { ProductCategory } from '@pannico/shared';

const prisma = new PrismaClient();

/**
 * Preset product catalog for the PoC. The catalog is seed-only (no management
 * UI). To retire a product, set `active: false` rather than deleting it so
 * historical order items keep their reference. Every product declares its
 * production line via `category` (`salty` = *salados*, `sweet` = *dulces*).
 */
const CATALOG: { name: string; category: ProductCategory }[] = [
  // Salados — savory production line.
  { name: 'Baguettin', category: 'salty' },
  { name: 'Baguetta Rustica', category: 'salty' },
  { name: 'Pan Party', category: 'salty' },
  { name: 'Pan Panni', category: 'salty' },
  { name: 'Pan Chip', category: 'salty' },
  { name: 'Mini Pan Semilla', category: 'salty' },
  { name: 'Ciabatta', category: 'salty' },
  { name: 'Mini Ciabatta', category: 'salty' },
  { name: 'Ciabatta Morada', category: 'salty' },
  { name: 'Mini Ciabatta Morada', category: 'salty' },
  { name: 'Hogaza de Campo', category: 'salty' },
  { name: 'Mini Pre-pizza', category: 'salty' },
  { name: 'Pre-pizza', category: 'salty' },
  // Dulces — sweet production line.
  { name: 'Torta de Nuez', category: 'sweet' },
  { name: 'Base Torta de Nuez', category: 'sweet' },
  { name: 'Torta de Almendras', category: 'sweet' },
  { name: 'Base Torta de Almendras', category: 'sweet' },
  { name: 'Tarta de Frutos Secos', category: 'sweet' },
  { name: 'Tarta Delicatessen de Chocolate', category: 'sweet' },
  { name: 'Base Delicatessen de Chocolate', category: 'sweet' },
  { name: 'Tarta Lemon Pie', category: 'sweet' },
  { name: 'Torta capitas', category: 'sweet' },
  { name: 'Torta bomba', category: 'sweet' },
  { name: 'Torta 3 leches', category: 'sweet' },
  { name: 'Pavlova', category: 'sweet' },
  { name: 'Stollen', category: 'sweet' },
  { name: 'Budin de limon con arandanos', category: 'sweet' },
  { name: 'Budin carrot', category: 'sweet' },
  { name: 'Rosca de Pascua', category: 'sweet' },
  { name: 'Mini tarta de Frutos secos', category: 'sweet' },
  { name: 'Mini tatan de manzana', category: 'sweet' },
  { name: 'Mini torta de capitas', category: 'sweet' },
  { name: 'Mini lemon pie', category: 'sweet' },
  { name: 'Mini 3 leches', category: 'sweet' },
  { name: 'Mini Budin de limon con arandanos', category: 'sweet' },
  { name: 'Mini Budin carrot', category: 'sweet' },
  { name: 'Mini Stollen', category: 'sweet' },
  { name: 'Biscotti', category: 'sweet' },
  { name: 'Mini Delicatessen de Chocolate', category: 'sweet' },
  { name: 'Mini de Almendras', category: 'sweet' },
  { name: 'Mini Nuez', category: 'sweet' },
  { name: 'Mini pavlova', category: 'sweet' },
  { name: 'Mini Quindim de Coco', category: 'sweet' },
  { name: 'Mini Bomba de chocolates con pistacho', category: 'sweet' },
  { name: 'Mini Budin de limon', category: 'sweet' },
  { name: 'Merenguitos', category: 'sweet' },
  { name: 'Galletitas de almendras', category: 'sweet' },
  { name: 'Galletitas de almendras chocolate', category: 'sweet' },
  { name: 'Alfajor de almendras', category: 'sweet' },
  { name: 'Alfajor de nuez', category: 'sweet' },
  { name: 'Alfajor de chocolate con almendras', category: 'sweet' },
  { name: 'Alfajor de almendras S/ AZUCAR', category: 'sweet' },
  { name: 'Alfajor de nuez S/ AZUCAR', category: 'sweet' },
  { name: 'Alfajor de chocolate S/ AZUCAR', category: 'sweet' },
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
        data: { active: true, category: product.category },
      });
    } else {
      await prisma.product.create({
        data: { name: product.name, active: true, category: product.category },
      });
    }
  }
  const count = await prisma.product.count();
  console.log(`Seed complete: ${count} products in catalog.`);

  // Ensure there is always an open bloque for new orders to land in. Idempotent:
  // does nothing when the migration (or a prior run) already created one.
  const openSlot = await prisma.slot.findFirst({ where: { status: 'open' } });
  if (!openSlot) {
    const max = await prisma.slot.aggregate({ _max: { seq: true } });
    const slot = await prisma.slot.create({
      data: { seq: (max._max.seq ?? 0) + 1, status: 'open' },
    });
    console.log(`Seed complete: opened bloque #${slot.seq}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
