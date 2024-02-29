/*
  Warnings:

  - A unique constraint covering the columns `[codigoBarra]` on the table `Productos` will be added. If there are existing duplicate values, this will fail.
  - Made the column `codigoBarra` on table `Productos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Productos" ALTER COLUMN "codigoBarra" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Productos_codigoBarra_key" ON "Productos"("codigoBarra");
