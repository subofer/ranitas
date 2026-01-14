-- AlterTable
ALTER TABLE "Presentaciones" ADD COLUMN     "esUnidadBase" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Productos" ADD COLUMN     "stockSuelto" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "StockPresentacion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "presentacionId" TEXT NOT NULL,
    "stockCerrado" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StockPresentacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockPresentacion_presentacionId_key" ON "StockPresentacion"("presentacionId");

-- AddForeignKey
ALTER TABLE "StockPresentacion" ADD CONSTRAINT "StockPresentacion_presentacionId_fkey" FOREIGN KEY ("presentacionId") REFERENCES "Presentaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
