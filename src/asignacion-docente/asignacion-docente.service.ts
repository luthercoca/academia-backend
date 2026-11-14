import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginate } from '../common/pagination.util.js';
import { porPalabras } from '../common/busqueda.util.js';
import { CreateAsignacionDocenteDto } from './dto/create-asignacion-docente.dto.js';
import { UpdateAsignacionDocenteDto } from './dto/update-asignacion-docente.dto.js';
import { AsignacionDocenteQueryDto } from './dto/asignacion-docente-query.dto.js';

export const ASIGNACION_INCLUDE = {
  docente: {
    select: {
      id: true,
      codigo: true,
      nombres: true,
      apellidos: true,
      estado: true,
    },
  },
  materia: { select: { id: true, codigo: true, nombre: true, estado: true } },
  curso: {
    select: {
      id: true,
      nombre: true,
      nivel: true,
      paralelo: true,
      estado: true,
    },
  },
  periodoAcademico: {
    select: {
      id: true,
      nombre: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
    },
  },
} satisfies Prisma.AsignacionDocenteInclude;

const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

/** Orden por columna; por defecto: activas primero y la gestión más reciente arriba. */
const ORDEN: Record<
  string,
  (o: 'asc' | 'desc') => Prisma.AsignacionDocenteOrderByWithRelationInput[]
> = {
  id: (o) => [{ id: o }],
  estado: (o) => [{ estado: o }, { id: 'asc' }],
  createdAt: (o) => [{ createdAt: o }],
  docente: (o) => [
    { docente: { apellidos: o } },
    { docente: { nombres: o } },
    { id: 'asc' },
  ],
  materia: (o) => [{ materia: { nombre: o } }, { id: 'asc' }],
  curso: (o) => [{ curso: { nombre: o } }, { id: 'asc' }],
  periodo: (o) => [{ periodoAcademico: { fechaInicio: o } }, { id: 'asc' }],
};
const ORDEN_POR_DEFECTO: Prisma.AsignacionDocenteOrderByWithRelationInput[] = [
  { estado: 'asc' },
  { periodoAcademico: { fechaInicio: 'desc' } },
  { curso: { nombre: 'asc' } },
  { materia: { nombre: 'asc' } },
  { id: 'asc' },
];

type Referencias = Pick<
  CreateAsignacionDocenteDto,
  'docenteId' | 'materiaId' | 'cursoId' | 'periodoAcademicoId'
>;

@Injectable()
export class AsignacionDocenteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAsignacionDocenteDto) {
    await this.validarReferencias(dto, dto);
    const igual = await this.prisma.asignacionDocente.findUnique({
      where: {
        docenteId_materiaId_cursoId_periodoAcademicoId: {
          docenteId: dto.docenteId,
          materiaId: dto.materiaId,
          cursoId: dto.cursoId,
          periodoAcademicoId: dto.periodoAcademicoId,
        },
      },
    });
    if (igual) {
      throw new ConflictException(
        igual.estado === 'INACTIVA'
          ? 'Esta asignación ya existe pero está inactiva: actívala desde la lista.'
          : 'Esta asignación ya existe.',
      );
    }
    if ((dto.estado ?? 'ACTIVA') === 'ACTIVA')
      await this.validarSinOtroDocente(dto);
    return this.guardar(() =>
      this.prisma.asignacionDocente.create({
        data: dto,
        include: ASIGNACION_INCLUDE,
      }),
    );
  }

  async findAll(query: AsignacionDocenteQueryDto) {
    const where: Prisma.AsignacionDocenteWhereInput = {
      docenteId: query.docenteId,
      materiaId: query.materiaId,
      cursoId: query.cursoId,
      periodoAcademicoId: query.periodoAcademicoId,
      estado: query.estado,
      ...porPalabras<Prisma.AsignacionDocenteWhereInput>(query.q, (p) => [
        { docente: { nombres: { contains: p } } },
        { docente: { apellidos: { contains: p } } },
        { docente: { codigo: { contains: p } } },
        { materia: { nombre: { contains: p } } },
        { materia: { codigo: { contains: p } } },
        { curso: { nombre: { contains: p } } },
        { periodoAcademico: { nombre: { contains: p } } },
      ]),
    };
    const orden = query.sortBy && ORDEN[query.sortBy];
    return paginate(this.prisma.asignacionDocente, {
      where,
      include: ASIGNACION_INCLUDE,
      orderBy: orden ? orden(query.order ?? 'asc') : ORDEN_POR_DEFECTO,
      page: query.page,
      limit: query.limit,
    });
  }

  async findOne(id: number) {
    const asignacion = await this.prisma.asignacionDocente.findUnique({
      where: { id },
      include: ASIGNACION_INCLUDE,
    });
    if (!asignacion) throw new NotFoundException('Asignación no encontrada');
    return asignacion;
  }

  async update(id: number, dto: UpdateAsignacionDocenteDto) {
    const actual = await this.findOne(id);
    const final = {
      docenteId: dto.docenteId ?? actual.docenteId,
      materiaId: dto.materiaId ?? actual.materiaId,
      cursoId: dto.cursoId ?? actual.cursoId,
      periodoAcademicoId: dto.periodoAcademicoId ?? actual.periodoAcademicoId,
    };
    // Solo se validan los datos que cambian: así se puede desactivar una asignación de una gestión ya cerrada.
    const cambian: Partial<Referencias> = {
      docenteId:
        final.docenteId !== actual.docenteId ? final.docenteId : undefined,
      materiaId:
        final.materiaId !== actual.materiaId ? final.materiaId : undefined,
      cursoId: final.cursoId !== actual.cursoId ? final.cursoId : undefined,
      periodoAcademicoId:
        final.periodoAcademicoId !== actual.periodoAcademicoId
          ? final.periodoAcademicoId
          : undefined,
    };
    await this.validarReferencias(final, cambian);
    if ((dto.estado ?? actual.estado) === 'ACTIVA')
      await this.validarSinOtroDocente(final, id);
    return this.guardar(() =>
      this.prisma.asignacionDocente.update({
        where: { id },
        data: { ...final, estado: dto.estado },
        include: ASIGNACION_INCLUDE,
      }),
    );
  }

  /** Pares curso + período donde el docente tiene al menos una asignación activa. */
  async cursosYPeriodosDe(docenteId: number) {
    return this.prisma.asignacionDocente.findMany({
      where: { docenteId, estado: 'ACTIVA' },
      select: { cursoId: true, periodoAcademicoId: true },
      distinct: ['cursoId', 'periodoAcademicoId'],
    });
  }

  /** Un docente solo califica las materias que tiene asignadas en el curso y período de la inscripción. */
  async asegurarQuePuedeCalificar(
    docenteId: number,
    inscripcionId: number,
    materiaId: number,
  ) {
    const inscripcion = await this.prisma.inscripcion.findUnique({
      where: { id: inscripcionId },
      select: {
        cursoId: true,
        periodoAcademicoId: true,
        curso: { select: { nombre: true } },
        periodoAcademico: { select: { nombre: true } },
      },
    });
    if (!inscripcion) return; // el servicio de calificaciones responde 404
    const asignada = await this.prisma.asignacionDocente.count({
      where: {
        docenteId,
        materiaId,
        cursoId: inscripcion.cursoId,
        periodoAcademicoId: inscripcion.periodoAcademicoId,
        estado: 'ACTIVA',
      },
    });
    if (asignada === 0) {
      const materia = await this.prisma.materia.findUnique({
        where: { id: materiaId },
        select: { nombre: true },
      });
      throw new ForbiddenException(
        `No tiene asignada la materia ${materia?.nombre ?? ''} en ${inscripcion.curso.nombre} (${inscripcion.periodoAcademico.nombre}). Pida al administrador la asignación.`,
      );
    }
  }

  /** Docente, materia y curso activos; período no finalizado. Solo revisa los datos indicados en `revisar`. */
  private async validarReferencias(
    refs: Referencias,
    revisar: Partial<Referencias>,
  ) {
    const [docente, materia, curso, periodo] = await Promise.all([
      this.prisma.docente.findUnique({ where: { id: refs.docenteId } }),
      this.prisma.materia.findUnique({ where: { id: refs.materiaId } }),
      this.prisma.curso.findUnique({ where: { id: refs.cursoId } }),
      this.prisma.periodoAcademico.findUnique({
        where: { id: refs.periodoAcademicoId },
      }),
    ]);
    if (!docente) throw new NotFoundException('Docente no encontrado');
    if (!materia) throw new NotFoundException('Materia no encontrada');
    if (!curso) throw new NotFoundException('Curso no encontrado');
    if (!periodo)
      throw new NotFoundException('Período académico no encontrado');
    if (revisar.docenteId && docente.estado !== 'ACTIVO')
      throw new BadRequestException('El docente no está activo');
    if (revisar.materiaId && materia.estado !== 'ACTIVA')
      throw new BadRequestException('La materia no está activa');
    if (revisar.cursoId && curso.estado !== 'ACTIVO')
      throw new BadRequestException('El curso no está activo');
    if (revisar.periodoAcademicoId && periodo.estado === 'FINALIZADO')
      throw new BadRequestException('El período académico ya está finalizado');
  }

  /** Una materia, en un curso y período, la dicta un solo docente activo. */
  private async validarSinOtroDocente(refs: Referencias, excluirId?: number) {
    const otra = await this.prisma.asignacionDocente.findFirst({
      where: {
        materiaId: refs.materiaId,
        cursoId: refs.cursoId,
        periodoAcademicoId: refs.periodoAcademicoId,
        estado: 'ACTIVA',
        docenteId: { not: refs.docenteId },
        id: excluirId ? { not: excluirId } : undefined,
      },
      include: ASIGNACION_INCLUDE,
    });
    if (otra) {
      throw new ConflictException(
        `${otra.materia.nombre} en ${otra.curso.nombre} (${otra.periodoAcademico.nombre}) ya está asignada a ${otra.docente.nombres} ${otra.docente.apellidos}. Desactiva esa asignación primero.`,
      );
    }
  }

  private async guardar<T>(accion: () => Promise<T>): Promise<T> {
    try {
      return await accion();
    } catch (e) {
      if ((e as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT) {
        throw new ConflictException('Esta asignación ya existe.');
      }
      throw e;
    }
  }
}
