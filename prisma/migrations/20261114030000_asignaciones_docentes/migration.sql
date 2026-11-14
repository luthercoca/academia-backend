-- CreateTable
CREATE TABLE `asignaciones_docentes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `docenteId` INTEGER NOT NULL,
    `materiaId` INTEGER NOT NULL,
    `cursoId` INTEGER NOT NULL,
    `periodoAcademicoId` INTEGER NOT NULL,
    `estado` ENUM('ACTIVA', 'INACTIVA') NOT NULL DEFAULT 'ACTIVA',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `asignacion_materia_curso_periodo_idx`(`materiaId`, `cursoId`, `periodoAcademicoId`),
    INDEX `asignacion_curso_periodo_idx`(`cursoId`, `periodoAcademicoId`),
    UNIQUE INDEX `asignacion_docente_unica`(`docenteId`, `materiaId`, `cursoId`, `periodoAcademicoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `asignaciones_docentes` ADD CONSTRAINT `asignaciones_docentes_docenteId_fkey` FOREIGN KEY (`docenteId`) REFERENCES `docentes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `asignaciones_docentes` ADD CONSTRAINT `asignaciones_docentes_materiaId_fkey` FOREIGN KEY (`materiaId`) REFERENCES `materias`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `asignaciones_docentes` ADD CONSTRAINT `asignaciones_docentes_cursoId_fkey` FOREIGN KEY (`cursoId`) REFERENCES `cursos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `asignaciones_docentes` ADD CONSTRAINT `asignaciones_docentes_periodoAcademicoId_fkey` FOREIGN KEY (`periodoAcademicoId`) REFERENCES `periodos_academicos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Traspaso: cada docente queda asignado a lo que ya venía calificando (materia + curso + período),
-- así nadie pierde acceso a sus materias al aplicar esta migración.
INSERT INTO `asignaciones_docentes` (`docenteId`, `materiaId`, `cursoId`, `periodoAcademicoId`, `estado`, `updatedAt`)
SELECT DISTINCT c.`docenteId`, c.`materiaId`, i.`cursoId`, i.`periodoAcademicoId`, 'ACTIVA', CURRENT_TIMESTAMP(3)
FROM `calificaciones` c
JOIN `inscripciones` i ON i.`id` = c.`inscripcionId`
WHERE c.`docenteId` IS NOT NULL;
