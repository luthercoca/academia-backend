import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EstudianteService } from './estudiante.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('EstudianteService', () => {
  let service: EstudianteService;
  const prisma = {
    estudiante: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    inscripcion: {
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [EstudianteService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(EstudianteService);
  });

  describe('create', () => {
    it('creates an estudiante', async () => {
      const dto = {
        codigo: 'EST-0001',
        nombres: 'Juan',
        apellidos: 'Pérez',
        documento: '12345678',
      };
      prisma.estudiante.create.mockResolvedValue({ id: 1, ...dto });

      const result = await service.create(dto as never);

      expect(result).toEqual({ id: 1, ...dto });
    });

    it('propagates a unique constraint violation on duplicate codigo/documento', async () => {
      const dto = {
        codigo: 'EST-0001',
        nombres: 'Juan',
        apellidos: 'Pérez',
        documento: '12345678',
      };
      const uniqueError = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      });
      prisma.estudiante.create.mockRejectedValue(uniqueError);

      await expect(service.create(dto as never)).rejects.toThrow();
    });

    const sinCodigo = { nombres: 'Ana', apellidos: 'Rojas', documento: '555' };
    const echo = ({ data }: { data: object }) => Promise.resolve({ id: 7, ...data });

    it('assigns the next EST-#### code when none is sent', async () => {
      prisma.$queryRaw.mockResolvedValue([{ mayor: 200n }]);
      prisma.estudiante.create.mockImplementation(echo);

      const result = await service.create(sinCodigo as never);

      expect(result).toMatchObject({ codigo: 'EST-0201', nombres: 'Ana' });
    });

    it('starts at EST-0001 when there are no students', async () => {
      prisma.$queryRaw.mockResolvedValue([{ mayor: null }]);
      prisma.estudiante.create.mockImplementation(echo);

      await expect(service.create(sinCodigo as never)).resolves.toMatchObject({ codigo: 'EST-0001' });
    });

    it('retries with the next code when two people save at the same time', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([{ mayor: 200 }]).mockResolvedValueOnce([{ mayor: 201 }]);
      prisma.estudiante.create
        .mockRejectedValueOnce(Object.assign(new Error('Unique'), { code: 'P2002', meta: { target: ['codigo'] } }))
        .mockImplementationOnce(echo);

      const result = await service.create(sinCodigo as never);

      expect(result).toMatchObject({ codigo: 'EST-0202' });
      expect(prisma.estudiante.create).toHaveBeenCalledTimes(2);
    });

    it('does not retry when the duplicate is the documento', async () => {
      prisma.$queryRaw.mockResolvedValue([{ mayor: 5 }]);
      prisma.estudiante.create.mockRejectedValue(
        Object.assign(new Error('Unique'), { code: 'P2002', meta: { target: ['documento'] } }),
      );

      await expect(service.create(sinCodigo as never)).rejects.toThrow('Ya existe un estudiante con ese documento');
      expect(prisma.estudiante.create).toHaveBeenCalledTimes(1);
    });

    it('keeps the code typed by the user', async () => {
      prisma.estudiante.create.mockImplementation(echo);

      await expect(service.create({ ...sinCodigo, codigo: 'X-1' } as never)).resolves.toMatchObject({ codigo: 'X-1' });
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when estudiante does not exist', async () => {
      prisma.estudiante.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deactivates the estudiante when dependent inscripciones exist', async () => {
      prisma.estudiante.findUnique.mockResolvedValue({ id: 1, estado: 'ACTIVO' });
      prisma.inscripcion.count.mockResolvedValue(1);
      prisma.estudiante.update.mockResolvedValue({ id: 1, estado: 'INACTIVO' });

      const result = await service.remove(1);

      expect(prisma.estudiante.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { estado: 'INACTIVO' },
      });
      expect(result).toEqual({ kind: 'deactivated', entity: { id: 1, estado: 'INACTIVO' } });
    });

    it('hard deletes the estudiante when no dependents exist', async () => {
      prisma.estudiante.findUnique.mockResolvedValue({ id: 1, estado: 'ACTIVO' });
      prisma.inscripcion.count.mockResolvedValue(0);
      prisma.estudiante.delete.mockResolvedValue({ id: 1 });

      const result = await service.remove(1);

      expect(prisma.estudiante.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ kind: 'deleted' });
    });
  });
});
