-- DropForeignKey
ALTER TABLE "DetalleDocumento" DROP CONSTRAINT "DetalleDocumento_docRelacionado_fkey";

-- DropForeignKey
ALTER TABLE "DetalleDocumento" DROP CONSTRAINT "DetalleDocumento_idProducto_fkey";

-- AddForeignKey
ALTER TABLE "DetalleDocumento" ADD CONSTRAINT "DetalleDocumento_docRelacionado_fkey" FOREIGN KEY ("docRelacionado") REFERENCES "Documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDocumento" ADD CONSTRAINT "DetalleDocumento_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
