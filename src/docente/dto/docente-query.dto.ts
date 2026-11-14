import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoDocente } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BusquedaQueryDto } from '../../common/dto/busqueda-query.dto.js';

export class DocenteQueryDto extends BusquedaQueryDto {
  @ApiPropertyOptional({ enum: EstadoDocente })
  @IsOptional()
  @IsEnum(EstadoDocente)
  estado?: EstadoDocente;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;
}
