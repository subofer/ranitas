/*
  Warnings:

  - You are about to drop the column `estado` on the `Documentos` table. All the data in the column will be lost.
  - You are about to drop the column `tipoDocumento` on the `Documentos` table. All the data in the column will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `idEstadoDocumento` to the `Documentos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idTipoDocumento` to the `Documentos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Documentos" DROP COLUMN "estado",
DROP COLUMN "tipoDocumento",
ADD COLUMN     "idEstadoDocumento" TEXT NOT NULL,
ADD COLUMN     "idTipoDocumento" TEXT NOT NULL;

-- DropTable
DROP TABLE "AuditLog";

-- CreateTable
CREATE TABLE "TiposDocumento" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TiposDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstadosDocumento" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EstadosDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TiposDocumento_codigo_key" ON "TiposDocumento"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "TiposDocumento_nombre_key" ON "TiposDocumento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "EstadosDocumento_codigo_key" ON "EstadosDocumento"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "EstadosDocumento_nombre_key" ON "EstadosDocumento"("nombre");

-- AddForeignKey
ALTER TABLE "Documentos" ADD CONSTRAINT "Documentos_idTipoDocumento_fkey" FOREIGN KEY ("idTipoDocumento") REFERENCES "TiposDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documentos" ADD CONSTRAINT "Documentos_idEstadoDocumento_fkey" FOREIGN KEY ("idEstadoDocumento") REFERENCES "EstadosDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
