import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { DiaSemana, EstadoHorario } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { BusquedaQueryDto } from '../../common/dto/busqueda-query.dto.js';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MENSAJE_HORA =
  'La hora debe tener el formato HH:MM (24 horas), por ejemplo 08:00';

export class CreateHorarioDto {
  @ApiProperty({
    description: 'Asignación docente (materia + docente + curso + período)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  asignacionId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  aulaId!: number;

  @ApiProperty({ enum: DiaSemana, example: DiaSemana.LUNES })
  @IsEnum(DiaSemana)
  diaSemana!: DiaSemana;

  @ApiProperty({ example: '08:00' })
  @Matches(HORA, { message: MENSAJE_HORA })
  horaInicio!: string;

  @ApiProperty({ example: '08:45' })
  @Matches(HORA, { message: MENSAJE_HORA })
  horaFin!: string;

  @ApiPropertyOptional({ enum: EstadoHorario, default: EstadoHorario.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoHorario)
  estado?: EstadoHorario;
}

export class UpdateHorarioDto extends PartialType(CreateHorarioDto) {}

export class HorarioQueryDto extends BusquedaQueryDto {
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
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  docenteId?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  materiaId?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  aulaId?: number;

  @ApiPropertyOptional({ enum: DiaSemana })
  @IsOptional()
  @IsEnum(DiaSemana)
  diaSemana?: DiaSemana;

  @ApiPropertyOptional({ enum: EstadoHorario })
  @IsOptional()
  @IsEnum(EstadoHorario)
  estado?: EstadoHorario;
}
