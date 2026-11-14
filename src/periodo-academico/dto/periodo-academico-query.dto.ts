import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoPeriodo } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { BusquedaQueryDto } from '../../common/dto/busqueda-query.dto.js';

export class PeriodoAcademicoQueryDto extends BusquedaQueryDto {
  @ApiPropertyOptional({ enum: EstadoPeriodo })
  @IsOptional()
  @IsEnum(EstadoPeriodo)
  estado?: EstadoPeriodo;
}
