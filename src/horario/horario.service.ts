import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiaSemana, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginate } from '../common/pagination.util.js';
import { porPalabras } from '../common/busqueda.util.js';
import {
  CreateHorarioDto,
  HorarioQueryDto,
  UpdateHorarioDto,
} from './dto/horario.dto.js';

export const HORARIO_INCLUDE = {
  aula: { select: { id: true, codigo: true, nombre: true, estado: true } },
  asignacion: {
    select: {
      id: true,
      estado: true,
      docenteId: true,
      materiaId: true,
      cursoId: true,
      periodoAcademicoId: true,
      docente: {
        select: { id: true, codigo: true, nombres: true, apellidos: true },
      },
      materia: { select: { id: true, codigo: true, nombre: true } },
      curso: {
        select: { id: true, nombre: true, nivel: true, paralelo: true },
      },
      periodoAcademico: { select: { id: true, nombre: true, estado: true } },
    },
  },
} satisfies Prisma.HorarioInclude;

export const NOMBRE_DIA: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
};

/** Qué horarios puede ver quien consulta: todo (ADMIN), los suyos (DOCENTE) o los de sus cursos (ESTUDIANTE). */
export type Alcance = { docenteId: number } | { estudianteId: number } | null;

type Bloque = {
  asignacionId: number;
  aulaId: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
};

@Injectable()
export class HorarioService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHorarioDto) {
    const asignacion = await this.validar(dto, {
      asignacion: true,
      aula: true,
    });
    if ((dto.estado ?? 'ACTIVO') === 'ACTIVO')
      await this.validarCruces(dto, asignacion);
    return this.prisma.horario.create({ data: dto, include: HORARIO_INCLUDE });
  }

  async findAll(query: HorarioQueryDto, alcance: Alcance = null) {
    const where: Prisma.HorarioWhereInput = {
      estado: query.estado,
      diaSemana: query.diaSemana,
      aulaId: query.aulaId,
      asignacion: {
        cursoId: query.cursoId,
        periodoAcademicoId: query.periodoAcademicoId,
        docenteId: query.docenteId,
        materiaId: query.materiaId,
      },
      ...porPalabras<Prisma.HorarioWhereInput>(query.q, (p) => [
        { asignacion: { materia: { nombre: { contains: p } } } },
        { asignacion: { docente: { nombres: { contains: p } } } },
        { asignacion: { docente: { apellidos: { contains: p } } } },
        { asignacion: { curso: { nombre: { contains: p } } } },
        { asignacion: { periodoAcademico: { nombre: { contains: p } } } },
        { aula: { nombre: { contains: p } } },
        { aula: { codigo: { contains: p } } },
      ]),
    };
    if (alcance) {
      // Docentes y estudiantes solo ven bloques activos de asignaciones activas.
      where.estado = 'ACTIVO';
      where.AND = [
        {
          asignacion: {
            estado: 'ACTIVA',
            ...(await this.filtroDeAlcance(alcance)),
          },
        },
      ];
    }
    return paginate(this.prisma.horario, {
      where,
      include: HORARIO_INCLUDE,
      orderBy: [
        { estado: 'asc' },
        { diaSemana: 'asc' },
        { horaInicio: 'asc' },
        { id: 'asc' },
      ],
      page: query.page,
      limit: query.limit,
    });
  }

  async findOne(id: number) {
    const horario = await this.prisma.horario.findUnique({
      where: { id },
      include: HORARIO_INCLUDE,
    });
    if (!horario) throw new NotFoundException('Horario no encontrado');
    return horario;
  }

  async update(id: number, dto: UpdateHorarioDto) {
    const actual = await this.findOne(id);
    const final: Bloque = {
      asignacionId: dto.asignacionId ?? actual.asignacionId,
      aulaId: dto.aulaId ?? actual.aulaId,
      diaSemana: dto.diaSemana ?? actual.diaSemana,
      horaInicio: dto.horaInicio ?? actual.horaInicio,
      horaFin: dto.horaFin ?? actual.horaFin,
    };
    // Solo se exige «activa» a la asignación o el aula que cambian: así se puede desactivar un bloque viejo.
    const asignacion = await this.validar(final, {
      asignacion: final.asignacionId !== actual.asignacionId,
      aula: final.aulaId !== actual.aulaId,
    });
    if ((dto.estado ?? actual.estado) === 'ACTIVO')
      await this.validarCruces(final, asignacion, id);
    return this.prisma.horario.update({
      where: { id },
      data: { ...final, estado: dto.estado },
      include: HORARIO_INCLUDE,
    });
  }

  private async filtroDeAlcance(
    alcance: NonNullable<Alcance>,
  ): Promise<Prisma.AsignacionDocenteWhereInput> {
    if ('docenteId' in alcance) return { docenteId: alcance.docenteId };
    const inscripciones = await this.prisma.inscripcion.findMany({
      where: { estudianteId: alcance.estudianteId, estado: 'ACTIVA' },
      select: { cursoId: true, periodoAcademicoId: true },
    });
    return { OR: inscripciones.length ? inscripciones : [{ id: -1 }] };
  }

  /** Horas válidas; asignación y aula existentes (y activas si se indica); período no finalizado. */
  private async validar(
    b: Bloque,
    exigirActivas: { asignacion: boolean; aula: boolean },
  ) {
    if (b.horaInicio >= b.horaFin) {
      throw new BadRequestException(
        'La hora de inicio debe ser anterior a la hora de fin',
      );
    }
    const [asignacion, aula] = await Promise.all([
      this.prisma.asignacionDocente.findUnique({
        where: { id: b.asignacionId },
        include: { periodoAcademico: { select: { estado: true } } },
      }),
      this.prisma.aula.findUnique({ where: { id: b.aulaId } }),
    ]);
    if (!asignacion)
      throw new NotFoundException('Asignación docente no encontrada');
    if (!aula) throw new NotFoundException('Aula no encontrada');
    if (exigirActivas.asignacion) {
      if (asignacion.estado !== 'ACTIVA')
        throw new BadRequestException('La asignación docente no está activa');
      if (asignacion.periodoAcademico.estado === 'FINALIZADO')
        throw new BadRequestException(
          'El período académico ya está finalizado',
        );
    }
    if (exigirActivas.aula && aula.estado !== 'ACTIVA')
      throw new BadRequestException('El aula no está activa');
    return asignacion;
  }

  /** En el mismo período y día, un aula, un docente o un curso no pueden tener dos clases que se cruzan. */
  private async validarCruces(
    b: Bloque,
    asignacion: {
      docenteId: number;
      cursoId: number;
      periodoAcademicoId: number;
    },
    excluirId?: number,
  ) {
    const choques = await this.prisma.horario.findMany({
      where: {
        id: excluirId ? { not: excluirId } : undefined,
        estado: 'ACTIVO',
        diaSemana: b.diaSemana,
        horaInicio: { lt: b.horaFin },
        horaFin: { gt: b.horaInicio },
        asignacion: {
          estado: 'ACTIVA',
          periodoAcademicoId: asignacion.periodoAcademicoId,
        },
        OR: [
          { aulaId: b.aulaId },
          { asignacion: { docenteId: asignacion.docenteId } },
          { asignacion: { cursoId: asignacion.cursoId } },
        ],
      },
      include: HORARIO_INCLUDE,
      take: 1,
    });
    const otro = choques[0];
    if (!otro) return;
    const cuando = `el ${NOMBRE_DIA[otro.diaSemana]} de ${otro.horaInicio} a ${otro.horaFin}`;
    const clase = `${otro.asignacion.materia.nombre} (${otro.asignacion.curso.nombre})`;
    if (otro.aulaId === b.aulaId) {
      throw new ConflictException(
        `El aula ${otro.aula.nombre} ya está ocupada ${cuando} por ${clase}.`,
      );
    }
    if (otro.asignacion.docenteId === asignacion.docenteId) {
      const d = otro.asignacion.docente;
      throw new ConflictException(
        `${d.nombres} ${d.apellidos} ya tiene clase ${cuando}: ${clase}.`,
      );
    }
    throw new ConflictException(
      `${otro.asignacion.curso.nombre} ya tiene clase ${cuando}: ${otro.asignacion.materia.nombre}.`,
    );
  }
}
