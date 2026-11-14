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
import { ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/auth.types.js';
import { HorarioService, type Alcance } from './horario.service.js';
import {
  CreateHorarioDto,
  HorarioQueryDto,
  UpdateHorarioDto,
} from './dto/horario.dto.js';

/**
 * Horarios académicos. El ADMIN los gestiona; el DOCENTE ve los suyos y el ESTUDIANTE los de los cursos en que
 * está inscrito (inscripción activa). No se eliminan: se activan o desactivan.
 */
@ApiTags('Horarios')
@Controller('horarios')
export class HorarioController {
  constructor(private readonly service: HorarioService) {}

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateHorarioDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: HorarioQueryDto, @CurrentUser() user: AuthUser) {
    let alcance: Alcance = null;
    if (user.rol === 'DOCENTE') alcance = { docenteId: user.docenteId ?? -1 };
    if (user.rol === 'ESTUDIANTE')
      alcance = { estudianteId: user.estudianteId ?? -1 };
    return this.service.findAll(query, alcance);
  }

  @Roles('ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHorarioDto) {
    return this.service.update(id, dto);
  }
}
