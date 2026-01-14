-- AlterTable
ALTER TABLE "DetalleDocumento" ADD COLUMN     "unidadVenta" TEXT,
ADD COLUMN     "variedad" TEXT,
ALTER COLUMN "cantidad" SET DATA TYPE DOUBLE PRECISION;
