import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AsignacionDocenteService } from './asignacion-docente.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { describirRegistro } from '../bitacora/bitacora.util.js';

describe('AsignacionDocenteService', () => {
  let service: AsignacionDocenteService;
  const prisma = {
    asignacionDocente: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    docente: { findUnique: vi.fn() },
    materia: { findUnique: vi.fn() },
    curso: { findUnique: vi.fn() },
    periodoAcademico: { findUnique: vi.fn() },
    inscripcion: { findUnique: vi.fn() },
  };
  const dto = { docenteId: 1, materiaId: 2, cursoId: 3, periodoAcademicoId: 4 };

  const referenciasActivas = () => {
    prisma.docente.findUnique.mockResolvedValue({ id: 1, estado: 'ACTIVO' });
    prisma.materia.findUnique.mockResolvedValue({
      id: 2,
      estado: 'ACTIVA',
      nombre: 'Matemática',
    });
    prisma.curso.findUnique.mockResolvedValue({ id: 3, estado: 'ACTIVO' });
    prisma.periodoAcademico.findUnique.mockResolvedValue({
      id: 4,
      estado: 'ACTIVO',
    });
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsignacionDocenteService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AsignacionDocenteService);
  });

  describe('create', () => {
    it('creates an assignment when nobody else teaches that subject there', async () => {
      referenciasActivas();
      prisma.asignacionDocente.findUnique.mockResolvedValue(null);
      prisma.asignacionDocente.findFirst.mockResolvedValue(null);
      prisma.asignacionDocente.create.mockResolvedValue({ id: 9, ...dto });

      await expect(service.create(dto)).resolves.toMatchObject({ id: 9 });
    });

    it('rejects when another active teacher already has that subject, course and period', async () => {
      referenciasActivas();
      prisma.asignacionDocente.findUnique.mockResolvedValue(null);
      prisma.asignacionDocente.findFirst.mockResolvedValue({
        materia: { nombre: 'Matemática' },
        curso: { nombre: '3ro A' },
        periodoAcademico: { nombre: 'Gestión 2026' },
        docente: { nombres: 'Luis', apellidos: 'Mamani' },
      });

      await expect(service.create(dto)).rejects.toThrow(
        'ya está asignada a Luis Mamani',
      );
      expect(prisma.asignacionDocente.create).not.toHaveBeenCalled();
    });

    it('tells to reactivate an existing inactive assignment instead of duplicating it', async () => {
      referenciasActivas();
      prisma.asignacionDocente.findUnique.mockResolvedValue({
        id: 5,
        estado: 'INACTIVA',
      });

      await expect(service.create(dto)).rejects.toThrow('está inactiva');
    });

    it('rejects a finished period', async () => {
      referenciasActivas();
      prisma.periodoAcademico.findUnique.mockResolvedValue({
        id: 4,
        estado: 'FINALIZADO',
      });

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('allows deactivating an assignment of a finished period', async () => {
      prisma.asignacionDocente.findUnique.mockResolvedValue({
        id: 5,
        ...dto,
        estado: 'ACTIVA',
      });
      referenciasActivas();
      prisma.periodoAcademico.findUnique.mockResolvedValue({
        id: 4,
        estado: 'FINALIZADO',
      });
      prisma.asignacionDocente.update.mockResolvedValue({
        id: 5,
        estado: 'INACTIVA',
      });

      await expect(
        service.update(5, { estado: 'INACTIVA' }),
      ).resolves.toMatchObject({ estado: 'INACTIVA' });
      expect(prisma.asignacionDocente.findFirst).not.toHaveBeenCalled();
    });

    it('checks for another teacher when reactivating', async () => {
      prisma.asignacionDocente.findUnique.mockResolvedValue({
        id: 5,
        ...dto,
        estado: 'INACTIVA',
      });
      referenciasActivas();
      prisma.asignacionDocente.findFirst.mockResolvedValue({
        materia: { nombre: 'M' },
        curso: { nombre: 'C' },
        periodoAcademico: { nombre: 'P' },
        docente: { nombres: 'X', apellidos: 'Y' },
      });

      await expect(
        service.update(5, { estado: 'ACTIVA' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('asegurarQuePuedeCalificar', () => {
    const inscripcion = {
      cursoId: 3,
      periodoAcademicoId: 4,
      curso: { nombre: '3ro A' },
      periodoAcademico: { nombre: 'Gestión 2026' },
    };

    it('lets a teacher grade an assigned subject', async () => {
      prisma.inscripcion.findUnique.mockResolvedValue(inscripcion);
      prisma.asignacionDocente.count.mockResolvedValue(1);

      await expect(
        service.asegurarQuePuedeCalificar(1, 10, 2),
      ).resolves.toBeUndefined();
    });

    it('forbids grading a subject that is not assigned', async () => {
      prisma.inscripcion.findUnique.mockResolvedValue(inscripcion);
      prisma.asignacionDocente.count.mockResolvedValue(0);
      prisma.materia.findUnique.mockResolvedValue({ nombre: 'Física' });

      const error = await service
        .asegurarQuePuedeCalificar(1, 10, 2)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as Error).message).toContain(
        'No tiene asignada la materia Física en 3ro A',
      );
    });
  });

  it('describes an assignment in the audit log', () => {
    const texto = describirRegistro(
      {
        docente: { nombres: 'Ana', apellidos: 'García' },
        materia: { nombre: 'Matemática' },
        curso: { nombre: '3ro A' },
        periodoAcademico: { nombre: 'Gestión 2026' },
      },
      { estado: 'INACTIVA' },
    );
    expect(texto).toBe(
      'Ana García · Matemática en 3ro A (Gestión 2026) → INACTIVA',
    );
  });
});
