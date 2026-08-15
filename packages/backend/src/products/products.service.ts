import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isProductCategory,
  type CreateProductRequest,
  type DeleteProductResponse,
  type ManagedProduct,
  type Product,
  type UpdateProductRequest,
} from '@pannico/shared';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The product catalog, and the manager's ability to maintain it.
 *
 * Deliberately the same shape as `ClientsService`, because it is the same
 * problem: a list orders point at, where removing an entry cannot be allowed to
 * take history with it. Where the two differ, they differ for a reason — a
 * product has no slug, since nothing upserts on it.
 */
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active products for the customer form and the order pickers. */
  async list(): Promise<Product[]> {
    return this.mapAll(
      await this.prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
    );
  }

  /**
   * The whole catalog for the Productos view — retired products included, each
   * with how many orders reference it. Its own method rather than a flag on
   * `list`: the pickers must never start offering retired products because the
   * management view needed them.
   */
  async listManaged(): Promise<ManagedProduct[]> {
    const rows = await this.prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { orderItems: true } } },
    });
    return rows.map(({ _count, ...product }) => ({
      ...product,
      category: product.category as Product['category'],
      orderCount: _count.orderItems,
    }));
  }

  async create(input: CreateProductRequest): Promise<Product> {
    const name = this.cleanName(input.name);
    const category = this.cleanCategory(input.category);
    const threshold = this.cleanCount(input.threshold, 'umbral') ?? 0;
    const packSize = this.cleanCount(input.packSize, 'paquete') ?? 0;
    const recipeSize = this.cleanCount(input.recipeSize, 'receta') ?? 0;

    await this.assertNameFree(name);

    return this.map(
      await this.prisma.product.create({
        data: { name, category, threshold, packSize, recipeSize, active: true },
      }),
    );
  }

  async update(id: string, input: UpdateProductRequest): Promise<Product> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product ${id} not found.`);
    }

    const data: {
      name?: string;
      category?: string;
      threshold?: number;
      packSize?: number;
      recipeSize?: number;
      active?: boolean;
    } = {};

    if (input.name !== undefined) {
      const name = this.cleanName(input.name);
      if (name !== existing.name) {
        await this.assertNameFree(name, id);
        data.name = name;
      }
    }
    if (input.category !== undefined) {
      data.category = this.cleanCategory(input.category);
    }
    if (input.threshold !== undefined) {
      data.threshold = this.cleanCount(input.threshold, 'umbral') ?? 0;
    }
    if (input.packSize !== undefined) {
      data.packSize = this.cleanCount(input.packSize, 'paquete') ?? 0;
    }
    if (input.recipeSize !== undefined) {
      data.recipeSize = this.cleanCount(input.recipeSize, 'receta') ?? 0;
    }
    if (input.active !== undefined) {
      data.active = input.active;
    }

    if (Object.keys(data).length === 0) {
      return this.map(existing);
    }
    return this.map(await this.prisma.product.update({ where: { id }, data }));
  }

  /**
   * Removes a product, which means one of two different things.
   *
   * `OrderItem.productId` has no cascade and closed bloques are history, so a
   * product an order line points at cannot be deleted — it is retired instead.
   * One nothing points at has no history to protect and goes outright. The
   * outcome comes back rather than being left for the caller to re-query, so the
   * UI can report what actually happened.
   */
  async remove(id: string): Promise<DeleteProductResponse> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found.`);
    }

    if (product._count.orderItems > 0) {
      await this.prisma.product.update({
        where: { id },
        data: { active: false },
      });
      return { id, outcome: 'deactivated' };
    }

    await this.prisma.product.delete({ where: { id } });
    return { id, outcome: 'deleted' };
  }

  private cleanName(raw: string): string {
    const name = raw.trim();
    if (name === '') {
      throw new BadRequestException(
        'El nombre del producto no puede estar vacío.',
      );
    }
    return name;
  }

  private cleanCategory(raw: string): string {
    if (!isProductCategory(raw)) {
      throw new BadRequestException(`Línea de producción desconocida: ${raw}.`);
    }
    return raw;
  }

  /**
   * Both the threshold and the pack size are counts of units, so both are whole
   * numbers and neither can be negative. Rejected rather than clamped: a negative
   * one is somebody meaning something else, and silently reading it as zero would
   * hide that.
   */
  private cleanCount(
    raw: number | undefined,
    field: 'umbral' | 'paquete' | 'receta',
  ): number | undefined {
    if (raw === undefined) return undefined;
    if (!Number.isInteger(raw) || raw < 0) {
      throw new BadRequestException(
        field === 'umbral'
          ? 'El umbral debe ser un número entero de cero o más.'
          : field === 'paquete'
            ? 'Las unidades por paquete deben ser un número entero de cero o más.'
            : 'Las unidades por receta deben ser un número entero de cero o más.',
      );
    }
    return raw;
  }

  /**
   * Checked here rather than left to the unique index so the message can name
   * the product it collided with — a P2002 only carries the column.
   */
  private async assertNameFree(name: string, exceptId?: string): Promise<void> {
    const clash = await this.prisma.product.findFirst({
      where: { name, ...(exceptId ? { id: { not: exceptId } } : {}) },
      select: { id: true },
    });
    if (clash) {
      throw new BadRequestException(`Ya existe un producto llamado "${name}".`);
    }
  }

  /** `category` is a plain string column; narrow it to the union at the boundary. */
  private map(row: {
    id: string;
    name: string;
    active: boolean;
    category: string;
    threshold: number;
    packSize: number;
    recipeSize: number;
  }): Product {
    return { ...row, category: row.category as Product['category'] };
  }

  private mapAll(rows: Parameters<ProductsService['map']>[0][]): Product[] {
    return rows.map((r) => this.map(r));
  }
}
