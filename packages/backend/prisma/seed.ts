import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Preset product catalog for the PoC. The catalog is seed-only (no management
 * UI). To retire a product, set `active: false` rather than deleting it so
 * historical order items keep their reference.
 */
const CATALOG: { name: string }[] = [
  { name: 'Baguettin' },
  { name: 'Baguett Rustica' },
  { name: 'Pan Party' },
  { name: 'Pan Panni' },
  { name: 'Pan Chip' },
  { name: 'Mini Pan Semilla' },
  { name: 'Ciabatta' },
  { name: 'Mini Ciabatta' },
  { name: 'Ciabatta Morada' },
  { name: 'Mini Ciabatta Morada' },
  { name: 'Hogaza de Campo' },
  { name: 'Mini Pre-pizza' },
  { name: 'Pre-pizza' },
  { name: 'Torta de Nuez' },
  { name: 'Base Torta de Nuez' },
  { name: 'Torta de Almendras' },
  { name: 'Base Torta de Almendras' },
  { name: 'Tarta de Frutos Secos' },
  { name: 'Tarta Delicatessen de Chocolate' },
  { name: 'Base Delicatessen de Chocolate' },
  { name: 'Tarta Lemon Pie' },
  { name: 'Torta capitas' },
  { name: 'Torta bomba' },
  { name: 'Torta 3 leches' },
  { name: 'Pavlova' },
  { name: 'Stollen' },
  { name: 'Budin de limon con arandanos' },
  { name: 'Budin carrot' },
  { name: 'Rosca de Pascua' },
  { name: 'Mini tarta de Frutos secos' },
  { name: 'Mini tatan de manzana' },
  { name: 'Mini torta de capitas' },
  { name: 'Mini lemon pie' },
  { name: 'Mini 3 leches' },
  { name: 'Mini Budin de limon con arandanos' },
  { name: 'Mini Budin carrot' },
  { name: 'Mini Stollen' },
  { name: 'Biscotti' },
  { name: 'Mini Delicatessen de Chocolate' },
  { name: 'Mini de Almendras' },
  { name: 'Mini Nuez' },
  { name: 'Mini pavlova' },
  { name: 'Mini Quindim de Coco' },
  { name: 'Mini Bomba de chocolates con pistacho' },
  { name: 'Mini Budin de limon' },
  { name: 'Merenguitos' },
  { name: 'Galletitas de almendras' },
  { name: 'Galletitas de almendras chocolate' },
  { name: 'Alfajor de almendras' },
  { name: 'Alfajor de nuez' },
  { name: 'Alfajor de chocolate con almendras' },
  { name: 'Alfajor de almendras S/ AZUCAR' },
  { name: 'Alfajor de nuez S/ AZUCAR' },
  { name: 'Alfajor de chocolate S/ AZUCAR' },
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
