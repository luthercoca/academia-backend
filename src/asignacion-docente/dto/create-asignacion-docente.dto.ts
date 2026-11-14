import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoAsignacion } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class CreateAsignacionDocenteDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  docenteId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  materiaId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursoId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  periodoAcademicoId!: number;

  @ApiPropertyOptional({
    enum: EstadoAsignacion,
    default: EstadoAsignacion.ACTIVA,
  })
  @IsOptional()
  @IsEnum(EstadoAsignacion)
  estado?: EstadoAsignacion;
}
