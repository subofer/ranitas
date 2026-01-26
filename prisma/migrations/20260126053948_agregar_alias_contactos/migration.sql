-- CreateEnum
CREATE TYPE "FuenteAlias" AS ENUM ('MANUAL', 'IA_SCAN', 'IMPORTACION');

-- DropForeignKey
ALTER TABLE "AgrupacionPresentaciones" DROP CONSTRAINT "AgrupacionPresentaciones_presentacionContenedoraId_fkey";

-- DropForeignKey
ALTER TABLE "AgrupacionPresentaciones" DROP CONSTRAINT "AgrupacionPresentaciones_presentacionContenidaId_fkey";

-- AlterTable
ALTER TABLE "Documentos" ADD COLUMN     "imagen" TEXT;

-- AlterTable
ALTER TABLE "Presentaciones" ADD COLUMN     "puedeAbrir" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "puedeCerrar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "puedeProducir" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AliasContacto" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactoId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "fuente" "FuenteAlias" NOT NULL DEFAULT 'MANUAL',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "creadoPor" TEXT,

    CONSTRAINT "AliasContacto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AliasContacto_alias_key" ON "AliasContacto"("alias");

-- CreateIndex
CREATE INDEX "AliasContacto_contactoId_idx" ON "AliasContacto"("contactoId");

-- CreateIndex
CREATE INDEX "AliasContacto_alias_idx" ON "AliasContacto"("alias");

-- AddForeignKey
ALTER TABLE "AgrupacionPresentaciones" ADD CONSTRAINT "AgrupacionPresentaciones_presentacionContenidaId_fkey" FOREIGN KEY ("presentacionContenidaId") REFERENCES "Presentaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgrupacionPresentaciones" ADD CONSTRAINT "AgrupacionPresentaciones_presentacionContenedoraId_fkey" FOREIGN KEY ("presentacionContenedoraId") REFERENCES "Presentaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AliasContacto" ADD CONSTRAINT "AliasContacto_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "Contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
