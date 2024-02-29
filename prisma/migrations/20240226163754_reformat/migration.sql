-- DropForeignKey
ALTER TABLE "Productos" DROP CONSTRAINT "Productos_categoriaId_fkey";

-- AlterTable
ALTER TABLE "Categorias" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Productos" ADD COLUMN     "codigoBarra" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "precioActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "categoriaId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Precios" (
    "id" SERIAL NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productoId" INTEGER NOT NULL,

    CONSTRAINT "Precios_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Productos" ADD CONSTRAINT "Productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Precios" ADD CONSTRAINT "Precios_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
