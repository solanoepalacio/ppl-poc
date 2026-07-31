import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Order } from '@prisma/client';
import { TokenService } from './token.service';

/** A request that has passed the TokenGuard carries the resolved order. */
export interface RequestWithOrder extends Request {
  order: Order;
}

/**
 * Resolves the `:token` route param to its order and rejects invalid,
 * closed-bloque, or already-consumed tokens (404). On success it attaches the
 * order to the request so the handler can act on it without re-querying. Apply to
 * endpoints that mutate an order (confirm); the read-only validation
 * endpoint reports validity in its body instead and does not use this guard.
 */
@Injectable()
export class TokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithOrder>();
    const token = req.params?.token;
    const order = token
      ? await this.tokenService.resolveValidOrder(token)
      : null;
    if (!order) {
      throw new NotFoundException(
        'Invalid, closed, or already-used link.',
      );
    }
    req.order = order;
    return true;
  }
}
