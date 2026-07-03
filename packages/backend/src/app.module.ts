import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { LinksModule } from './links/links.module';
import { OrdersModule } from './orders/orders.module';
import { SlotsModule } from './slots/slots.module';
import { ClientsModule } from './clients/clients.module';
import { ExpiryModule } from './expiry/expiry.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SlotsModule,
    ClientsModule,
    LinksModule,
    OrdersModule,
    ExpiryModule,
  ],
})
export class AppModule {}
