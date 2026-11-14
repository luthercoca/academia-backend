import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto.js';

/** Listado paginado con búsqueda por contenido (`q`): ver common/busqueda.util.ts. */
export class BusquedaQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Busca por contenido, palabra por palabra, en las columnas visibles',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
