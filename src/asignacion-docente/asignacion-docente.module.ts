import { Global, Module } from '@nestjs/common';
import { AsignacionDocenteController } from './asignacion-docente.controller.js';
import { AsignacionDocenteService } from './asignacion-docente.service.js';

/** Global: calificaciones, cursos, materias y estudiantes lo usan para acotar lo que ve cada docente. */
@Global()
@Module({
  controllers: [AsignacionDocenteController],
  providers: [AsignacionDocenteService],
  exports: [AsignacionDocenteService],
})
export class AsignacionDocenteModule {}
