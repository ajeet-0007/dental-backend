import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from '../../database/entities/log.entity';
import { LoggerController } from './logger.controller';
import { LogService } from './logger.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Log])],
  controllers: [LoggerController],
  providers: [LogService],
  exports: [LogService],
})
export class LoggerModule {}
