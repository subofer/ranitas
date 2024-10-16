/*
  Warnings:

  - You are about to drop the column `alturas` on the `Calles` table. All the data in the column will be lost.
  - You are about to drop the column `idLocalidadCensal` on the `Calles` table. All the data in the column will be lost.
  - You are about to drop the column `esMarca` on the `Contactos` table. All the data in the column will be lost.
  - You are about to drop the column `depto` on the `Direcciones` table. All the data in the column will be lost.
  - You are about to drop the column `detalles` on the `Direcciones` table. All the data in the column will be lost.
  - You are about to drop the column `idCalle` on the `Direcciones` table. All the data in the column will be lost.
  - You are about to drop the column `idLocalidadCensal` on the `Direcciones` table. All the data in the column will be lost.
  - You are about to drop the column `numeroCalle` on the `Direcciones` table. All the data in the column will be lost.
  - You are about to drop the column `piso` on the `Direcciones` table. All the data in the column will be lost.
  - You are about to drop the column `categoria` on the `Localidades` table. All the data in the column will be lost.
  - You are about to drop the column `centroideLat` on the `Localidades` table. All the data in the column will be lost.
  - You are about to drop the column `centroideLon` on the `Localidades` table. All the data in the column will be lost.
  - You are about to drop the column `fuente` on the `Localidades` table. All the data in the column will be lost.
  - You are about to drop the column `idDepartamento` on the `Localidades` table. All the data in the column will be lost.
  - You are about to drop the column `idLocalidadCensal` on the `Localidades` table. All the data in the column will be lost.
  - You are about to drop the column `idMunicipio` on the `Localidades` table. All the data in the column will be lost.
  - You are about to drop the column `precioActual` on the `Productos` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `Productos` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Productos` table. All the data in the column will be lost.
  - You are about to drop the column `unidad` on the `Productos` table. All the data in the column will be lost.
  - You are about to drop the column `categoria` on the `Provincias` table. All the data in the column will be lost.
  - You are about to drop the column `centroideLat` on the `Provincias` table. All the data in the column will be lost.
  - You are about to drop the column `centroideLon` on the `Provincias` table. All the data in the column will be lost.
  - You are about to drop the column `fuente` on the `Provincias` table. All the data in the column will be lost.
  - You are about to drop the column `isoNombre` on the `Provincias` table. All the data in the column will be lost.
  - You are about to drop the `Precios` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ContactosToProductos` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DireccionMovimiento" AS ENUM ('ENTRADA', 'SALIDA');

-- DropForeignKey
ALTER TABLE "Direcciones" DROP CONSTRAINT "Direcciones_idCalle_fkey";

-- DropForeignKey
ALTER TABLE "Precios" DROP CONSTRAINT "Precios_idProducto_fkey";

-- DropForeignKey
ALTER TABLE "_ContactosToProductos" DROP CONSTRAINT "_ContactosToProductos_A_fkey";

-- DropForeignKey
ALTER TABLE "_ContactosToProductos" DROP CONSTRAINT "_ContactosToProductos_B_fkey";

-- AlterTable
ALTER TABLE "Calles" DROP COLUMN "alturas",
DROP COLUMN "idLocalidadCensal";

-- AlterTable
ALTER TABLE "Contactos" DROP COLUMN "esMarca";

-- AlterTable
ALTER TABLE "DetalleDocumento" ADD COLUMN     "descuento" DOUBLE PRECISION,
ADD COLUMN     "impuestos" JSONB,
ADD COLUMN     "unidad" TEXT;

-- AlterTable
ALTER TABLE "Direcciones" DROP COLUMN "depto",
DROP COLUMN "detalles",
DROP COLUMN "idCalle",
DROP COLUMN "idLocalidadCensal",
DROP COLUMN "numeroCalle",
DROP COLUMN "piso";

-- AlterTable
ALTER TABLE "Localidades" DROP COLUMN "categoria",
DROP COLUMN "centroideLat",
DROP COLUMN "centroideLon",
DROP COLUMN "fuente",
DROP COLUMN "idDepartamento",
DROP COLUMN "idLocalidadCensal",
DROP COLUMN "idMunicipio";

-- AlterTable
ALTER TABLE "Productos" DROP COLUMN "precioActual",
DROP COLUMN "size",
DROP COLUMN "stock",
DROP COLUMN "unidad",
ADD COLUMN     "cantidad" DOUBLE PRECISION,
ADD COLUMN     "unidadMedida" TEXT;

-- AlterTable
ALTER TABLE "Provincias" DROP COLUMN "categoria",
DROP COLUMN "centroideLat",
DROP COLUMN "centroideLon",
DROP COLUMN "fuente",
DROP COLUMN "isoNombre";

-- DropTable
DROP TABLE "Precios";

-- DropTable
DROP TABLE "_ContactosToProductos";

-- CreateTable
CREATE TABLE "Precio" (
    "id" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productoId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "esActual" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Precio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presentacion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "codigoBarra" TEXT,
    "productoId" TEXT NOT NULL,

    CONSTRAINT "Presentacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoProveedores" (
    "idProducto" TEXT NOT NULL,
    "idProveedor" TEXT NOT NULL,

    CONSTRAINT "ProductoProveedores_pkey" PRIMARY KEY ("idProducto","idProveedor")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "direccion" "DireccionMovimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productoId" TEXT NOT NULL,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Precio" ADD CONSTRAINT "Precio_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Precio" ADD CONSTRAINT "Precio_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentacion" ADD CONSTRAINT "Presentacion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoProveedores" ADD CONSTRAINT "ProductoProveedores_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoProveedores" ADD CONSTRAINT "ProductoProveedores_idProveedor_fkey" FOREIGN KEY ("idProveedor") REFERENCES "Contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
