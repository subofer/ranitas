-- CreateEnum
CREATE TYPE "EstadoDocumento" AS ENUM ('IMPAGA', 'PAGA', 'PARCIAL');

-- AlterTable
ALTER TABLE "Documentos" ADD COLUMN     "estado" "EstadoDocumento" NOT NULL DEFAULT 'IMPAGA';
