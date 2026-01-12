-- DropForeignKey
ALTER TABLE "Presentaciones" DROP CONSTRAINT "Presentaciones_productoId_fkey";

-- DropForeignKey
ALTER TABLE "ProductoProveedor" DROP CONSTRAINT "ProductoProveedor_productoId_fkey";

-- AddForeignKey
ALTER TABLE "Presentaciones" ADD CONSTRAINT "Presentaciones_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
