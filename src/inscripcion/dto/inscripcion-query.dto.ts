import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoInscripcion } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { BusquedaQueryDto } from '../../common/dto/busqueda-query.dto.js';

export class InscripcionQueryDto extends BusquedaQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estudianteId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodoAcademicoId?: number;

  @ApiPropertyOptional({ enum: EstadoInscripcion })
  @IsOptional()
  @IsEnum(EstadoInscripcion)
  estado?: EstadoInscripcion;
}
