-- DropForeignKey
ALTER TABLE "Precios" DROP CONSTRAINT "Precios_idProducto_fkey";

-- AddForeignKey
ALTER TABLE "Precios" ADD CONSTRAINT "Precios_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
