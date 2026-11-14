-- CreateTable
CREATE TABLE `aulas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `capacidad` INTEGER NULL,
    `ubicacion` VARCHAR(191) NULL,
    `estado` ENUM('ACTIVA', 'INACTIVA') NOT NULL DEFAULT 'ACTIVA',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `aulas_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asignacionId` INTEGER NOT NULL,
    `aulaId` INTEGER NOT NULL,
    `diaSemana` ENUM('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO') NOT NULL,
    `horaInicio` VARCHAR(5) NOT NULL,
    `horaFin` VARCHAR(5) NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `horario_aula_dia_idx`(`aulaId`, `diaSemana`),
    INDEX `horario_asignacion_idx`(`asignacionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `horarios` ADD CONSTRAINT `horarios_asignacionId_fkey` FOREIGN KEY (`asignacionId`) REFERENCES `asignaciones_docentes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `horarios` ADD CONSTRAINT `horarios_aulaId_fkey` FOREIGN KEY (`aulaId`) REFERENCES `aulas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
