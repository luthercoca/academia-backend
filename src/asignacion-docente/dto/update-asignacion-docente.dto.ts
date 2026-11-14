import { PartialType } from '@nestjs/swagger';
import { CreateAsignacionDocenteDto } from './create-asignacion-docente.dto.js';

/** Cambiar el docente, la materia, el curso, el período o el estado (activar / desactivar). */
export class UpdateAsignacionDocenteDto extends PartialType(
  CreateAsignacionDocenteDto,
) {}
