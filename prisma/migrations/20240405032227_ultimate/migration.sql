/*
  Warnings:

  - The primary key for the `Proveedores` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[cuit]` on the table `Proveedores` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `cuit` to the `Proveedores` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Facturas" DROP CONSTRAINT "Facturas_proveedorId_fkey";

-- DropForeignKey
ALTER TABLE "ProductoProveedor" DROP CONSTRAINT "ProductoProveedor_proveedorId_fkey";

-- AlterTable
ALTER TABLE "Facturas" ADD COLUMN     "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "proveedorId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "ProductoProveedor" ALTER COLUMN "proveedorId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Productos" ALTER COLUMN "size" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Proveedores" DROP CONSTRAINT "Proveedores_pkey",
ADD COLUMN     "cuit" TEXT NOT NULL,
ADD COLUMN     "iva" TEXT,
ADD COLUMN     "persona" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "telefono" SET DEFAULT '0800-completar-telefono',
ALTER COLUMN "email" SET DEFAULT 'completar@email.com',
ADD CONSTRAINT "Proveedores_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Proveedores_id_seq";

-- CreateTable
CREATE TABLE "Unidades" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "simbolo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unidades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unidades_nombre_key" ON "Unidades"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Unidades_simbolo_key" ON "Unidades"("simbolo");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedores_cuit_key" ON "Proveedores"("cuit");

-- AddForeignKey
ALTER TABLE "ProductoProveedor" ADD CONSTRAINT "ProductoProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facturas" ADD CONSTRAINT "Facturas_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
