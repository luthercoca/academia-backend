import { ApiPropertyOptional } from '@nestjs/swagger';
import { AccionBitacora } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { BusquedaQueryDto } from '../../common/dto/busqueda-query.dto.js';
import { RECURSOS_BITACORA } from '../bitacora.util.js';

export class BitacoraQueryDto extends BusquedaQueryDto {
  @ApiPropertyOptional({ enum: RECURSOS_BITACORA })
  @IsOptional()
  @IsIn(RECURSOS_BITACORA)
  recurso?: string;

  @ApiPropertyOptional({ enum: AccionBitacora })
  @IsOptional()
  @IsEnum(AccionBitacora)
  accion?: AccionBitacora;

  @ApiPropertyOptional({ description: 'Solo lo hecho por este usuario' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usuarioId?: number;

  @ApiPropertyOptional({ description: 'Desde esta fecha (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  desde?: string;

  @ApiPropertyOptional({ description: 'Hasta esta fecha (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  hasta?: string;
}
