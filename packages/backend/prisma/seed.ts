import { PrismaClient } from '@prisma/client';
import type { ProductCategory } from '@pannico/shared';

const prisma = new PrismaClient();

/**
 * Preset product catalog for the PoC. The catalog is seed-only (no management
 * UI). To retire a product, set `active: false` rather than deleting it so
 * historical order items keep their reference. Every product declares its
 * production line via `category` (`salty` = *salados*, `sweet` = *dulces*).
 *
 * Source: `resources/articulos agosto 2026 (1).XLS` (agosto 2026), `subrubros_descripcion`
 * SALADO/DULCE mapped to salty/sweet. Names are verbatim from that export except for
 * trimmed whitespace and de-shouted ALL-CAPS entries.
 */
const CATALOG: { name: string; category: ProductCategory }[] = [
  // Salados — savory production line.
  { name: 'Baguetta Rustica', category: 'salty' },
  { name: 'Baguettin', category: 'salty' },
  { name: 'Ciabatta', category: 'salty' },
  { name: 'Ciabatta morada', category: 'salty' },
  { name: 'Mini Ciabatta', category: 'salty' },
  { name: 'Mini ciabatta morada', category: 'salty' },
  { name: 'Pan Chip', category: 'salty' },
  { name: 'Pan de Campo', category: 'salty' },
  { name: 'Pan party', category: 'salty' },
  { name: 'Pan Panni', category: 'salty' },
  { name: 'Pan Pita', category: 'salty' },
  { name: 'Prepizza individual', category: 'salty' },
  { name: 'Prepizza grande', category: 'salty' },
  { name: 'Schiacciata', category: 'salty' },
  // Dulces — sweet production line.
  { name: 'Alfajor de almendras', category: 'sweet' },
  { name: 'Alfajor de almendras SIN AZUCAR', category: 'sweet' },
  { name: 'Alfajor de Chocolate', category: 'sweet' },
  { name: 'Alfajor de chocolate SIN AZUCAR', category: 'sweet' },
  { name: 'Alfajor de Nuez', category: 'sweet' },
  { name: 'Alfajor de nuez SIN AZUCAR', category: 'sweet' },
  { name: 'Biscotti', category: 'sweet' },
  { name: 'Budin Carrot grande', category: 'sweet' },
  { name: 'Budin de limon con arandanos grande', category: 'sweet' },
  { name: 'Galletita de almendra', category: 'sweet' },
  { name: 'Galletita de almendra con chocolate', category: 'sweet' },
  { name: 'Mini Bomba de chocolate c / pistacho', category: 'sweet' },
  { name: 'Mini budin carrot', category: 'sweet' },
  { name: 'Mini budin de limon con arandanos', category: 'sweet' },
  { name: 'Mini budin de limon sin harina', category: 'sweet' },
  { name: 'Mini Delicatessen de chocolate c / naranja', category: 'sweet' },
  { name: 'Mini Lemon pie', category: 'sweet' },
  { name: 'Mini Pavlova', category: 'sweet' },
  { name: 'Mini quindim de coco', category: 'sweet' },
  { name: 'Mini tarta de frutos secos', category: 'sweet' },
  { name: 'Mini torta de Almendras', category: 'sweet' },
  { name: 'Mini torta de capitas', category: 'sweet' },
  { name: 'Mini torta de nuez', category: 'sweet' },
  { name: 'Pavlova', category: 'sweet' },
  { name: 'Rosca de pascua', category: 'sweet' },
  { name: 'Stollen mediano', category: 'sweet' },
  { name: 'Tarta de Frutos secos', category: 'sweet' },
  { name: 'Tarta de lemon pie grande', category: 'sweet' },
  { name: 'Torta 3 leches', category: 'sweet' },
  { name: 'Torta bomba de pistacho', category: 'sweet' },
  { name: 'Torta de Almendras', category: 'sweet' },
  { name: 'Torta de capitas', category: 'sweet' },
  { name: 'Torta de Nuez', category: 'sweet' },
  { name: 'Torta delicatessen de chocolate', category: 'sweet' },
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
