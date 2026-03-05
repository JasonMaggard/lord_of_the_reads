import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutItemInput } from './checkout-item.input';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private mergeDuplicateItems(items: CheckoutItemInput[]) {
    const merged = new Map<string, CheckoutItemInput>();

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException('Quantity must be a positive integer');
      }

      const key = `${item.bookId}::${item.format}`;
      const existing = merged.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        merged.set(key, { ...item });
      }
    }

    return [...merged.values()];
  }

  async checkout(params: { userId: string; items: CheckoutItemInput[] }) {
    const userId = params.userId.trim();
    const items = this.mergeDuplicateItems(params.items ?? []);

    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    if (items.length === 0) {
      throw new BadRequestException('At least one checkout item is required');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      const validFormats = await tx.bookFormat.findMany({
        where: {
          OR: items.map((item) => ({
            bookId: item.bookId,
            format: item.format,
          })),
        },
        include: {
          book: {
            select: {
              id: true,
              priceCents: true,
            },
          },
        },
      });

      if (validFormats.length !== items.length) {
        throw new BadRequestException('One or more checkout items have an invalid book/format');
      }

      const priceByBookAndFormat = new Map(
        validFormats.map((row) => [`${row.bookId}::${row.format}`, row.book.priceCents]),
      );

      const order = await tx.order.create({
        data: {
          userId,
        },
      });

      await tx.orderItem.createMany({
        data: items.map((item) => ({
          orderId: order.id,
          bookId: item.bookId,
          format: item.format,
          quantity: item.quantity,
          unitPriceCents: priceByBookAndFormat.get(`${item.bookId}::${item.format}`) ?? 0,
        })),
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          items: true,
        },
      });
    });
  }

  async findById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });
  }

  async findByUser(userId: string, limit: number, offset: number) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      skip: offset,
    });
  }
}
