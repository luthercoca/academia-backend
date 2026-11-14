import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { HorarioService } from './horario.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { describirRegistro } from '../bitacora/bitacora.util.js';

describe('HorarioService', () => {
  let service: HorarioService;
  const prisma = {
    horario: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    asignacionDocente: { findUnique: vi.fn() },
    aula: { findUnique: vi.fn() },
    inscripcion: { findMany: vi.fn() },
  };
  const dto = {
    asignacionId: 1,
    aulaId: 2,
    diaSemana: 'LUNES' as const,
    horaInicio: '08:00',
    horaFin: '08:45',
  };
  const asignacion = {
    id: 1,
    estado: 'ACTIVA',
    docenteId: 7,
    cursoId: 3,
    periodoAcademicoId: 4,
    periodoAcademico: { estado: 'ACTIVO' },
  };
  const otroBloque = (cambios: Record<string, unknown>) => ({
    diaSemana: 'LUNES',
    horaInicio: '08:30',
    horaFin: '09:15',
    aulaId: 9,
    aula: { nombre: 'Aula 101' },
    asignacion: {
      docenteId: 8,
      cursoId: 5,
      materia: { nombre: 'Física' },
      curso: { nombre: '2do B' },
      docente: { nombres: 'Luis', apellidos: 'Mamani' },
    },
    ...cambios,
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [HorarioService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(HorarioService);
    prisma.asignacionDocente.findUnique.mockResolvedValue(asignacion);
    prisma.aula.findUnique.mockResolvedValue({ id: 2, estado: 'ACTIVA' });
  });

  it('creates a block when nothing overlaps', async () => {
    prisma.horario.findMany.mockResolvedValue([]);
    prisma.horario.create.mockResolvedValue({ id: 1 });
    await expect(service.create(dto)).resolves.toEqual({ id: 1 });
    // Busca cruces el mismo día, que empiecen antes del fin y terminen después del inicio.
    const where = prisma.horario.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      diaSemana: 'LUNES',
      horaInicio: { lt: '08:45' },
      horaFin: { gt: '08:00' },
    });
  });

  it('rejects an end time before the start time', async () => {
    await expect(
      service.create({ ...dto, horaInicio: '09:00', horaFin: '08:00' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the room is taken', async () => {
    prisma.horario.findMany.mockResolvedValue([otroBloque({ aulaId: 2 })]);
    await expect(service.create(dto)).rejects.toThrow(
      'El aula Aula 101 ya está ocupada el Lunes de 08:30 a 09:15 por Física (2do B).',
    );
  });

  it('rejects when the teacher already has class', async () => {
    prisma.horario.findMany.mockResolvedValue([
      otroBloque({
        asignacion: { ...otroBloque({}).asignacion, docenteId: 7 },
      }),
    ]);
    await expect(service.create(dto)).rejects.toThrow(
      'Luis Mamani ya tiene clase el Lunes de 08:30 a 09:15',
    );
  });

  it('rejects when the course already has class', async () => {
    prisma.horario.findMany.mockResolvedValue([
      otroBloque({ asignacion: { ...otroBloque({}).asignacion, cursoId: 3 } }),
    ]);
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an inactive assignment', async () => {
    prisma.asignacionDocente.findUnique.mockResolvedValue({
      ...asignacion,
      estado: 'INACTIVA',
    });
    await expect(service.create(dto)).rejects.toThrow(
      'La asignación docente no está activa',
    );
  });

  it('allows deactivating an old block without checking overlaps', async () => {
    prisma.horario.findUnique.mockResolvedValue({
      id: 3,
      ...dto,
      estado: 'ACTIVO',
    });
    prisma.asignacionDocente.findUnique.mockResolvedValue({
      ...asignacion,
      estado: 'INACTIVA',
    });
    prisma.horario.update.mockResolvedValue({ id: 3, estado: 'INACTIVO' });
    await expect(
      service.update(3, { estado: 'INACTIVO' }),
    ).resolves.toMatchObject({ estado: 'INACTIVO' });
    expect(prisma.horario.findMany).not.toHaveBeenCalled();
  });

  it('a student only sees the courses of their active enrollments', async () => {
    prisma.inscripcion.findMany.mockResolvedValue([
      { cursoId: 3, periodoAcademicoId: 4 },
    ]);
    prisma.horario.findMany.mockResolvedValue([]);
    prisma.horario.count.mockResolvedValue(0);
    await service.findAll({ page: 1, limit: 20 }, { estudianteId: 11 });
    const where = prisma.horario.findMany.mock.calls[0][0].where;
    expect(where.estado).toBe('ACTIVO');
    expect(where.AND).toEqual([
      {
        asignacion: {
          estado: 'ACTIVA',
          OR: [{ cursoId: 3, periodoAcademicoId: 4 }],
        },
      },
    ]);
  });

  it('a teacher only sees their own blocks', async () => {
    prisma.horario.findMany.mockResolvedValue([]);
    prisma.horario.count.mockResolvedValue(0);
    await service.findAll(
      { page: 1, limit: 20, docenteId: 99 },
      { docenteId: 7 },
    );
    const where = prisma.horario.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual([
      { asignacion: { estado: 'ACTIVA', docenteId: 7 } },
    ]);
  });

  it('describes a block in the audit log', () => {
    const texto = describirRegistro(
      {
        diaSemana: 'MIERCOLES',
        horaInicio: '10:00',
        horaFin: '10:45',
        aula: { nombre: 'Laboratorio 1' },
        asignacion: {
          materia: { nombre: 'Química' },
          curso: { nombre: '4to A' },
        },
      },
      {},
    );
    expect(texto).toBe(
      'Química · 4to A · Miércoles 10:00–10:45 · Laboratorio 1',
    );
  });
});
