import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginate } from '../common/pagination.util.js';
import { porPalabras } from '../common/busqueda.util.js';
import { AulaQueryDto, CreateAulaDto, UpdateAulaDto } from './dto/aula.dto.js';

const SORTABLE_FIELDS = new Set([
  'id',
  'codigo',
  'nombre',
  'capacidad',
  'ubicacion',
  'estado',
]);

@Injectable()
export class AulaService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAulaDto) {
    return this.guardar(() => this.prisma.aula.create({ data: dto }));
  }

  findAll(query: AulaQueryDto) {
    const where: Prisma.AulaWhereInput = {
      estado: query.estado,
      ...porPalabras<Prisma.AulaWhereInput>(query.q, (p) => [
        { codigo: { contains: p } },
        { nombre: { contains: p } },
        { ubicacion: { contains: p } },
      ]),
    };
    const sortBy =
      query.sortBy && SORTABLE_FIELDS.has(query.sortBy)
        ? query.sortBy
        : 'codigo';
    return paginate(this.prisma.aula, {
      where,
      orderBy: [{ [sortBy]: query.order ?? 'asc' }, { id: 'asc' }],
      page: query.page,
      limit: query.limit,
    });
  }

  async findOne(id: number) {
    const aula = await this.prisma.aula.findUnique({ where: { id } });
    if (!aula) throw new NotFoundException('Aula no encontrada');
    return aula;
  }

  async update(id: number, dto: UpdateAulaDto) {
    await this.findOne(id);
    return this.guardar(() =>
      this.prisma.aula.update({ where: { id }, data: dto }),
    );
  }

  private async guardar<T>(accion: () => Promise<T>): Promise<T> {
    try {
      return await accion();
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ya existe un aula con ese código');
      }
      throw e;
    }
  }
}
