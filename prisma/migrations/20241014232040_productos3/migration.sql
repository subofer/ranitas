/*
  Warnings:

  - A unique constraint covering the columns `[productoId,proveedorId]` on the table `ProductoProveedor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProductoProveedor_productoId_proveedorId_key" ON "ProductoProveedor"("productoId", "proveedorId");
