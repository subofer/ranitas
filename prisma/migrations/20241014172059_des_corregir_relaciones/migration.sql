/*
  Warnings:

  - You are about to drop the column `descuento` on the `DetalleDocumento` table. All the data in the column will be lost.
  - You are about to drop the column `impuestos` on the `DetalleDocumento` table. All the data in the column will be lost.
  - You are about to drop the column `unidad` on the `DetalleDocumento` table. All the data in the column will be lost.
  - You are about to drop the column `cantidad` on the `Productos` table. All the data in the column will be lost.
  - You are about to drop the column `unidadMedida` on the `Productos` table. All the data in the column will be lost.
  - You are about to drop the `MovimientoStock` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Precio` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Presentacion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductoProveedores` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `alturas` to the `Calles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idLocalidadCensal` to the `Calles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idLocalidadCensal` to the `Localidades` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MovimientoStock" DROP CONSTRAINT "MovimientoStock_productoId_fkey";

-- DropForeignKey
ALTER TABLE "Precio" DROP CONSTRAINT "Precio_productoId_fkey";

-- DropForeignKey
ALTER TABLE "Precio" DROP CONSTRAINT "Precio_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "Presentacion" DROP CONSTRAINT "Presentacion_productoId_fkey";

-- DropForeignKey
ALTER TABLE "ProductoProveedores" DROP CONSTRAINT "ProductoProveedores_idProducto_fkey";

-- DropForeignKey
ALTER TABLE "ProductoProveedores" DROP CONSTRAINT "ProductoProveedores_idProveedor_fkey";

-- AlterTable
ALTER TABLE "Calles" ADD COLUMN     "alturas" TEXT NOT NULL,
ADD COLUMN     "idLocalidadCensal" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Contactos" ADD COLUMN     "esMarca" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DetalleDocumento" DROP COLUMN "descuento",
DROP COLUMN "impuestos",
DROP COLUMN "unidad";

-- AlterTable
ALTER TABLE "Direcciones" ADD COLUMN     "depto" TEXT,
ADD COLUMN     "detalles" TEXT,
ADD COLUMN     "idCalle" TEXT,
ADD COLUMN     "idLocalidadCensal" TEXT,
ADD COLUMN     "numeroCalle" INTEGER,
ADD COLUMN     "piso" TEXT;

-- AlterTable
ALTER TABLE "Localidades" ADD COLUMN     "idDepartamento" TEXT,
ADD COLUMN     "idLocalidadCensal" TEXT NOT NULL,
ADD COLUMN     "idMunicipio" TEXT;

-- AlterTable
ALTER TABLE "Productos" DROP COLUMN "cantidad",
DROP COLUMN "unidadMedida",
ADD COLUMN     "precioActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "size" DOUBLE PRECISION,
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unidad" TEXT;

-- DropTable
DROP TABLE "MovimientoStock";

-- DropTable
DROP TABLE "Precio";

-- DropTable
DROP TABLE "Presentacion";

-- DropTable
DROP TABLE "ProductoProveedores";

-- DropEnum
DROP TYPE "DireccionMovimiento";

-- CreateTable
CREATE TABLE "Precios" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precio" DOUBLE PRECISION NOT NULL,
    "idProducto" TEXT NOT NULL,

    CONSTRAINT "Precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContactosToProductos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_ContactosToProductos_AB_unique" ON "_ContactosToProductos"("A", "B");

-- CreateIndex
CREATE INDEX "_ContactosToProductos_B_index" ON "_ContactosToProductos"("B");

-- AddForeignKey
ALTER TABLE "Precios" ADD CONSTRAINT "Precios_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direcciones" ADD CONSTRAINT "Direcciones_idCalle_fkey" FOREIGN KEY ("idCalle") REFERENCES "Calles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactosToProductos" ADD CONSTRAINT "_ContactosToProductos_A_fkey" FOREIGN KEY ("A") REFERENCES "Contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactosToProductos" ADD CONSTRAINT "_ContactosToProductos_B_fkey" FOREIGN KEY ("B") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
