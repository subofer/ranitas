/*
  Warnings:

  - The primary key for the `ProductoProveedor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ProductoProveedor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[proveedorId,productoId]` on the table `ProductoProveedor` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ProductoProveedor_productoId_proveedorId_key";

-- AlterTable
ALTER TABLE "ProductoProveedor" DROP CONSTRAINT "ProductoProveedor_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ProductoProveedor_pkey" PRIMARY KEY ("proveedorId", "productoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoProveedor_proveedorId_productoId_key" ON "ProductoProveedor"("proveedorId", "productoId");
