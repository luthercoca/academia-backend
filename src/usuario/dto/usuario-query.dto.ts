import { ApiPropertyOptional } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { BusquedaQueryDto } from '../../common/dto/busqueda-query.dto.js';

export class UsuarioQueryDto extends BusquedaQueryDto {
  @ApiPropertyOptional({ enum: RolUsuario })
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @ApiPropertyOptional({ description: 'true: solo cuentas activas; false: solo desactivadas' })
  @IsOptional()
  // En la URL llega como texto: «false» no debe convertirse en true (conversión implícita global).
  @Transform(({ obj }: { obj: Record<string, unknown> }) =>
    obj.activo === 'true' ? true : obj.activo === 'false' ? false : obj.activo,
  )
  @IsBoolean({ message: 'activo debe ser true o false' })
  activo?: boolean;
}
