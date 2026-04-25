import { Module as NestModule } from '@nestjs/common';
import { IaController } from './ia.controller';
import { IaService } from './ia.service';
import { PrismaService } from '../prisma.service';
import { SatService } from '../sat.service';

@NestModule({
  controllers: [IaController],
  providers: [IaService, PrismaService, SatService],
})
export class IaModule {}
