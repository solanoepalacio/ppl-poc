import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { LinksModule } from './links/links.module';
import { OrdersModule } from './orders/orders.module';
import { SlotsModule } from './slots/slots.module';
import { ClientsModule } from './clients/clients.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    SlotsModule,
    ClientsModule,
    LinksModule,
    OrdersModule,
  ],
})
export class AppModule {}
