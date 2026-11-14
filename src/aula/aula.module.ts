import { Module } from '@nestjs/common';
import { AulaController } from './aula.controller.js';
import { AulaService } from './aula.service.js';

@Module({
  controllers: [AulaController],
  providers: [AulaService],
})
export class AulaModule {}
