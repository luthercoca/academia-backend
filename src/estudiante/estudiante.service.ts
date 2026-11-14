import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginate } from '../common/pagination.util.js';
import { CALIFICACION_INCLUDE } from '../calificacion/calificacion.include.js';
import { removeOrDeactivate } from '../common/soft-delete.util.js';
import { groupBy, promedio } from '../common/array.util.js';
import { CreateEstudianteDto } from './dto/create-estudiante.dto.js';
import { UpdateEstudianteDto } from './dto/update-estudiante.dto.js';
import { EstudianteQueryDto } from './dto/estudiante-query.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { porPalabras } from '../common/busqueda.util.js';

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';
const REINTENTOS_CODIGO = 5;

/** Campo único que chocó ('codigo' | 'documento' | 'otro'), o null si no es un error de duplicado. */
function campoDuplicado(e: unknown): 'codigo' | 'documento' | 'otro' | null {
  const error = e as { code?: string; meta?: { target?: unknown; driverAdapterError?: { cause?: unknown } } };
  if (error?.code !== PRISMA_UNIQUE_CONSTRAINT) return null;
  const pista = JSON.stringify([error.meta?.target, error.meta?.driverAdapterError?.cause]);
  if (pista.includes('documento')) return 'documento';
  if (pista.includes('codigo')) return 'codigo';
  return 'otro';
}

/** Traduce un duplicado a 409 con un mensaje claro; cualquier otro error sigue igual. */
function comoConflicto(e: unknown): unknown {
  const campo = campoDuplicado(e);
  if (campo === 'documento') return new ConflictException('Ya existe un estudiante con ese documento');
  if (campo === 'codigo') return new ConflictException('Ya existe un estudiante con ese código');
  if (campo === 'otro') return new ConflictException('Ya existe un estudiante con esos datos');
  return e;
}

const SORTABLE_FIELDS = new Set([
  'id',
  'codigo',
  'nombres',
  'apellidos',
  'documento',
  'email',
  'estado',
  'createdAt',
]);

@Injectable()
export class EstudianteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEstudianteDto) {
    const data = {
      ...dto,
      fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : undefined,
    };
    if (dto.codigo) {
      try {
        return await this.prisma.estudiante.create({ data: { ...data, codigo: dto.codigo } });
      } catch (e) {
        throw comoConflicto(e);
      }
    }

    // Código automático: varias personas pueden inscribir a la vez, así que se calcula
    // en el momento de guardar y, si otro lo tomó justo antes, se reintenta con el siguiente.
    for (let intento = 0; ; intento++) {
      const codigo = await this.siguienteCodigo();
      try {
        return await this.prisma.estudiante.create({ data: { ...data, codigo } });
      } catch (e) {
        // Solo se reintenta si chocó el código (un documento repetido se informa tal cual).
        if (campoDuplicado(e) !== 'codigo' || intento >= REINTENTOS_CODIGO) throw comoConflicto(e);
      }
    }
  }

  /** Siguiente código EST-#### a partir del mayor número ya usado (mínimo 4 cifras). */
  private async siguienteCodigo(): Promise<string> {
    const [fila] = await this.prisma.$queryRaw<{ mayor: bigint | number | null }[]>`
      SELECT MAX(CAST(SUBSTRING(codigo, 5) AS UNSIGNED)) AS mayor
      FROM estudiantes WHERE codigo REGEXP '^EST-[0-9]+$'`;
    const siguiente = Number(fila?.mayor ?? 0) + 1;
    return `EST-${String(siguiente).padStart(4, '0')}`;
  }

  async findAll(query: EstudianteQueryDto, docenteId?: number) {
    const cursosDelDocente = docenteId
      ? await this.prisma.asignacionDocente.findMany({
          where: { docenteId, estado: 'ACTIVA' },
          select: { cursoId: true, periodoAcademicoId: true },
          distinct: ['cursoId', 'periodoAcademicoId'],
        })
      : null;
    const where: Prisma.EstudianteWhereInput = {
      inscripciones: cursosDelDocente
        ? { some: { OR: cursosDelDocente.length ? cursosDelDocente : [{ id: -1 }] } }
        : undefined,
      estado: query.estado,
      // «nombre» (compatibilidad): solo nombres y apellidos.
      OR: query.nombre && !query.q
        ? [{ nombres: { contains: query.nombre } }, { apellidos: { contains: query.nombre } }]
        : undefined,
      // «q»: por contenido, palabra por palabra.
      ...porPalabras<Prisma.EstudianteWhereInput>(query.q, (p) => [
        { nombres: { contains: p } },
        { apellidos: { contains: p } },
        { codigo: { contains: p } },
        { documento: { contains: p } },
        { email: { contains: p } },
      ]),
    };

    const sortBy = query.sortBy && SORTABLE_FIELDS.has(query.sortBy) ? query.sortBy : 'id';

    return paginate(this.prisma.estudiante, {
      where,
      orderBy: { [sortBy]: query.order ?? 'asc' },
      page: query.page,
      limit: query.limit,
    });
  }

  async findOne(id: number) {
    const estudiante = await this.prisma.estudiante.findUnique({ where: { id } });
    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    return estudiante;
  }

  async update(id: number, dto: UpdateEstudianteDto) {
    await this.findOne(id);
    return this.prisma.estudiante.update({
      where: { id },
      data: {
        ...dto,
        fechaNacimiento: dto.fechaNacimiento ? new Date(dto.fechaNacimiento) : undefined,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return removeOrDeactivate({
      hasDependents: async () =>
        (await this.prisma.inscripcion.count({ where: { estudianteId: id } })) > 0,
      deactivate: () =>
        this.prisma.estudiante.update({ where: { id }, data: { estado: 'INACTIVO' } }),
      hardDelete: () => this.prisma.estudiante.delete({ where: { id } }),
    });
  }

  async findInscripciones(estudianteId: number, query: PaginationQueryDto) {
    await this.findOne(estudianteId);

    return paginate(this.prisma.inscripcion, {
      where: { estudianteId },
      orderBy: { id: query.order ?? 'asc' },
      page: query.page,
      limit: query.limit,
    });
  }

  async findCalificaciones(estudianteId: number, query: PaginationQueryDto) {
    await this.findOne(estudianteId);

    return paginate(this.prisma.calificacion, {
      where: { inscripcion: { estudianteId } },
      include: CALIFICACION_INCLUDE,
      orderBy: { id: query.order ?? 'asc' },
      page: query.page,
      limit: query.limit,
    });
  }

  async getHistorialAcademico(id: number) {
    const estudiante = await this.prisma.estudiante.findUnique({
      where: { id },
      include: {
        inscripciones: {
          include: {
            periodoAcademico: true,
            curso: true,
            calificaciones: { include: { materia: true } },
          },
        },
      },
    });

    if (!estudiante) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    const todas = estudiante.inscripciones.flatMap((inscripcion) =>
      inscripcion.calificaciones.map((calificacion) => calificacion.nota),
    );

    return {
      estudiante: {
        id: estudiante.id,
        codigo: estudiante.codigo,
        nombre: `${estudiante.nombres} ${estudiante.apellidos}`,
      },
      promedioGeneral: promedio(todas),
      periodos: estudiante.inscripciones.map((inscripcion) => {
        const porMateria = groupBy(
          inscripcion.calificaciones,
          (calificacion) => calificacion.materia.id,
        );

        return {
          periodoId: inscripcion.periodoAcademico.id,
          periodo: inscripcion.periodoAcademico.nombre,
          cursoId: inscripcion.curso.id,
          curso: inscripcion.curso.nombre,
          promedio: promedio(inscripcion.calificaciones.map((calificacion) => calificacion.nota)),
          materias: [...porMateria.values()].map((calificaciones) => ({
            materiaId: calificaciones[0]!.materia.id,
            materia: calificaciones[0]!.materia.nombre,
            promedio: promedio(calificaciones.map((calificacion) => calificacion.nota)),
            calificaciones: calificaciones.map((calificacion) => ({
              tipo: calificacion.tipo,
              nota: calificacion.nota,
            })),
          })),
        };
      }),
    };
  }
}
