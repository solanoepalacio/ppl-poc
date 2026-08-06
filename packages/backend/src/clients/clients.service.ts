import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  Client,
  CreateClientRequest,
  DeleteClientResponse,
  ManagedClient,
  UpdateClientRequest,
} from '@pannico/shared';
import { normalizeClientPhone, slugifyClientName } from '@pannico/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active clients for the back-office picker, ordered by display name. */
  async list(): Promise<Client[]> {
    return this.prisma.client.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * The whole directory for the Clientes view — retired clients included, each
   * with how many orders reference it. Kept as its own method rather than a flag
   * on `list`: the picker must never start offering retired clients because the
   * management view needed them.
   */
  async listManaged(): Promise<ManagedClient[]> {
    const rows = await this.prisma.client.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { orders: true } } },
    });
    return rows.map(({ _count, ...client }) => ({
      ...client,
      orderCount: _count.orders,
    }));
  }

  /**
   * Ensures a client exists and is active, throwing `BadRequestException`
   * otherwise. The order-creation paths call this to validate a submitted
   * `clientId` before binding an order to it — mirrors the catalog check in
   * `OrdersService.validateItemsAgainstCatalog` so a bad reference can never
   * be persisted.
   */
  async assertActive(clientId: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { active: true },
    });
    if (!client || !client.active) {
      throw new BadRequestException(`Client ${clientId} is not available.`);
    }
  }

  async create(input: CreateClientRequest): Promise<Client> {
    const name = input.name.trim();
    if (name === '') {
      throw new BadRequestException(
        'El nombre del cliente no puede estar vacío.',
      );
    }
    const slug = slugifyClientName(name);
    if (slug === '') {
      throw new BadRequestException(
        'El nombre debe tener al menos una letra o un número.',
      );
    }
    const phone = normalizeClientPhone(input.phone);

    await this.assertNoCollision({ name, slug, phone });

    return this.prisma.client.create({
      data: { name, slug, phone, active: true },
    });
  }

  /**
   * Updates the display name, the phone and the active flag — never the slug.
   * Renaming a client keeps its identity, which is what the orders pointing at
   * it require, and what keeps data-migration upserts matching the existing row
   * instead of inserting a second one.
   */
  async update(id: string, input: UpdateClientRequest): Promise<Client> {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Client ${id} not found.`);
    }

    const data: { name?: string; phone?: string | null; active?: boolean } = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (name === '') {
        throw new BadRequestException(
          'El nombre del cliente no puede estar vacío.',
        );
      }
      if (name !== existing.name) {
        // Only the name is checked, not a re-derived slug: the slug is frozen at
        // creation, so a rename cannot collide on it.
        await this.assertNoCollision({ name, exceptId: id });
        data.name = name;
      }
    }

    if (input.phone !== undefined) {
      const phone = normalizeClientPhone(input.phone);
      if (phone !== existing.phone) {
        await this.assertNoCollision({ phone, exceptId: id });
        data.phone = phone;
      }
    }

    if (input.active !== undefined) {
      data.active = input.active;
    }

    if (Object.keys(data).length === 0) {
      return existing;
    }
    return this.prisma.client.update({ where: { id }, data });
  }

  /**
   * Removes a client, which means one of two different things.
   *
   * `Order.clientId` has no cascade and closed bloques are history, so a client
   * an order points at cannot be deleted — it is retired instead. A client
   * nothing points at has no history to protect and is deleted outright. The
   * outcome comes back rather than being left for the caller to re-query, so the
   * UI can report what actually happened.
   */
  async remove(id: string): Promise<DeleteClientResponse> {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!client) {
      throw new NotFoundException(`Client ${id} not found.`);
    }

    if (client._count.orders > 0) {
      await this.prisma.client.update({
        where: { id },
        data: { active: false },
      });
      return { id, outcome: 'deactivated' };
    }

    await this.prisma.client.delete({ where: { id } });
    return { id, outcome: 'deleted' };
  }

  /**
   * Rejects a name, slug or phone already in use, naming which one collided.
   *
   * The distinction matters to the manager: two names differing only in case or
   * punctuation are different names but the same slug, so reporting that as a
   * duplicate name describes a conflict they cannot find in the list. Checked
   * here rather than left to the unique indexes so the message can say which
   * field it was and against whom — a P2002 only carries the column.
   */
  private async assertNoCollision(candidate: {
    name?: string;
    slug?: string;
    phone?: string | null;
    exceptId?: string;
  }): Promise<void> {
    const { name, slug, phone, exceptId } = candidate;
    const not = exceptId ? { id: { not: exceptId } } : {};

    if (name !== undefined) {
      const clash = await this.prisma.client.findFirst({
        where: { name, ...not },
        select: { id: true },
      });
      if (clash) {
        throw new BadRequestException(`Ya existe un cliente llamado "${name}".`);
      }
    }

    if (slug !== undefined) {
      const clash = await this.prisma.client.findFirst({
        where: { slug, ...not },
        select: { name: true },
      });
      if (clash) {
        throw new BadRequestException(
          `Ese nombre coincide con "${clash.name}" salvo por mayúsculas, acentos o puntuación. Usá un nombre que los distinga.`,
        );
      }
    }

    if (phone !== undefined && phone !== null) {
      const clash = await this.prisma.client.findFirst({
        where: { phone, ...not },
        select: { name: true },
      });
      if (clash) {
        throw new BadRequestException(
          `Ese teléfono ya es el de "${clash.name}".`,
        );
      }
    }
  }
}
