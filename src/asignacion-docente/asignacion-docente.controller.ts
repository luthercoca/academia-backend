import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { AsignacionDocenteService } from './asignacion-docente.service.js';
import { CreateAsignacionDocenteDto } from './dto/create-asignacion-docente.dto.js';
import { UpdateAsignacionDocenteDto } from './dto/update-asignacion-docente.dto.js';
import { AsignacionDocenteQueryDto } from './dto/asignacion-docente-query.dto.js';

/**
 * Asignación docente: qué materia dicta cada docente, en qué curso y período.
 * El ADMIN las gestiona; el DOCENTE solo consulta las suyas. No se eliminan: se activan o desactivan.
 */
@ApiTags('Asignaciones docentes')
@Controller('asignaciones-docentes')
export class AsignacionDocenteController {
  constructor(private readonly service: AsignacionDocenteService) {}

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateAsignacionDocenteDto) {
    return this.service.create(dto);
  }

  @Roles('ADMIN', 'DOCENTE')
  @Get()
  findAll(
    @Query() query: AsignacionDocenteQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    // Un docente solo ve sus asignaciones, envíe el filtro que envíe.
    if (user.rol === 'DOCENTE') query.docenteId = user.docenteId ?? -1;
    return this.service.findAll(query);
  }

  @Roles('ADMIN', 'DOCENTE')
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    const asignacion = await this.service.findOne(id);
    if (user.rol === 'DOCENTE' && asignacion.docenteId !== user.docenteId) {
      throw new ForbiddenException('Solo puede ver sus propias asignaciones');
    }
    return asignacion;
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAsignacionDocenteDto,
  ) {
    return this.service.update(id, dto);
  }
}
