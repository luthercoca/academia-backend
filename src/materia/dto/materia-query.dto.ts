import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoMateria } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BusquedaQueryDto } from '../../common/dto/busqueda-query.dto.js';

export class MateriaQueryDto extends BusquedaQueryDto {
  @ApiPropertyOptional({ enum: EstadoMateria })
  @IsOptional()
  @IsEnum(EstadoMateria)
  estado?: EstadoMateria;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;
}
