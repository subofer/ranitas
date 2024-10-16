/*
  Warnings:

  - You are about to drop the `_ContactosToProductos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ContactosToProductos" DROP CONSTRAINT "_ContactosToProductos_A_fkey";

-- DropForeignKey
ALTER TABLE "_ContactosToProductos" DROP CONSTRAINT "_ContactosToProductos_B_fkey";

-- DropTable
DROP TABLE "_ContactosToProductos";

-- CreateTable
CREATE TABLE "ProductoProveedor" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,

    CONSTRAINT "ProductoProveedor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
