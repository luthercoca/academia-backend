import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EstadoAula } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { BusquedaQueryDto } from '../../common/dto/busqueda-query.dto.js';

export class CreateAulaDto {
  @ApiProperty({ example: 'A-101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  codigo!: string;

  @ApiProperty({ example: 'Aula 101' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @ApiPropertyOptional({ example: 35 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  capacidad?: number;

  @ApiPropertyOptional({ example: 'Bloque A, planta baja' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  ubicacion?: string;

  @ApiPropertyOptional({ enum: EstadoAula, default: EstadoAula.ACTIVA })
  @IsOptional()
  @IsEnum(EstadoAula)
  estado?: EstadoAula;
}

export class UpdateAulaDto extends PartialType(CreateAulaDto) {}

export class AulaQueryDto extends BusquedaQueryDto {
  @ApiPropertyOptional({ enum: EstadoAula })
  @IsOptional()
  @IsEnum(EstadoAula)
  estado?: EstadoAula;
}
