-- AlterTable
ALTER TABLE "Productos" ADD COLUMN     "marcaId" TEXT;

-- AddForeignKey
ALTER TABLE "Productos" ADD CONSTRAINT "Productos_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "Contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
