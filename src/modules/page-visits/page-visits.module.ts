import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageVisit } from '../../database/entities/page-visit.entity';
import { PageVisitsController } from './page-visits.controller';
import { PageVisitsService } from './page-visits.service';

@Module({
  imports: [TypeOrmModule.forFeature([PageVisit])],
  controllers: [PageVisitsController],
  providers: [PageVisitsService],
})
export class PageVisitsModule {}
