import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoCurso } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BusquedaQueryDto } from '../../common/dto/busqueda-query.dto.js';

export class CursoQueryDto extends BusquedaQueryDto {
  @ApiPropertyOptional({ enum: EstadoCurso })
  @IsOptional()
  @IsEnum(EstadoCurso)
  estado?: EstadoCurso;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nivel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;
}
