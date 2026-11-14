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
import { AulaService } from './aula.service.js';
import { AulaQueryDto, CreateAulaDto, UpdateAulaDto } from './dto/aula.dto.js';

/** Aulas (solo ADMIN). No se eliminan: se activan o desactivan. */
@ApiTags('Aulas')
@Roles('ADMIN')
@Controller('aulas')
export class AulaController {
  constructor(private readonly service: AulaService) {}

  @Post()
  create(@Body() dto: CreateAulaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: AulaQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAulaDto) {
    return this.service.update(id, dto);
  }
}
