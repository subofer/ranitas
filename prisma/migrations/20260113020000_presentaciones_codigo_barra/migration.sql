-- AlterTable
ALTER TABLE "Presentaciones" ADD COLUMN     "codigoBarra" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Presentaciones_codigoBarra_key" ON "Presentaciones"("codigoBarra");
