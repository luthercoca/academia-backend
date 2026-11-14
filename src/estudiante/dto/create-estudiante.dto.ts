import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoEstudiante } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEstudianteDto {
  @ApiPropertyOptional({
    example: 'EST-0001',
    description: 'Si no se envía, el servidor asigna el siguiente (EST-0001, EST-0002…).',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  codigo?: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  nombres!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty()
  apellidos!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @IsNotEmpty()
  documento!: string;

  @ApiPropertyOptional({ example: 'juan.perez@colegio.edu' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '70000000' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({ example: '2010-05-14' })
  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @ApiPropertyOptional({ enum: EstadoEstudiante, default: EstadoEstudiante.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoEstudiante)
  estado?: EstadoEstudiante;
}
