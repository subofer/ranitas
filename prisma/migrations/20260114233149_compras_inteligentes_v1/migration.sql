-- CreateEnum
CREATE TYPE "FrecuenciaEntrega" AS ENUM ('SEMANAL', 'QUINCENAL');

-- CreateEnum
CREATE TYPE "CompraEstadoPedido" AS ENUM ('BORRADOR', 'PENDIENTE_SELECCION', 'ENVIADO', 'RECIBIDO');

-- AlterTable
ALTER TABLE "Contactos" ADD COLUMN     "diasEntrega" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "frecuenciaEntrega" "FrecuenciaEntrega",
ADD COLUMN     "leadTimeDias" INTEGER;

-- AlterTable
ALTER TABLE "Productos" ADD COLUMN     "puntoPedido" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProveedorSkuAlias" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedorId" TEXT NOT NULL,
    "productoId" TEXT,
    "presentacionId" TEXT,
    "sku" TEXT NOT NULL,
    "nombreEnProveedor" TEXT,
    "leadTimeDias" INTEGER,
    "esPreferido" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProveedorSkuAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompraPedido" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numero" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedorId" TEXT,
    "estado" "CompraEstadoPedido" NOT NULL DEFAULT 'BORRADOR',
    "notas" TEXT,
    "creadoPor" TEXT,
    "pedidoId" TEXT,

    CONSTRAINT "CompraPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompraPedidoItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "compraPedidoId" TEXT NOT NULL,
    "proveedorId" TEXT,
    "productoId" TEXT NOT NULL,
    "presentacionId" TEXT,
    "stockActual" DOUBLE PRECISION,
    "puntoPedido" DOUBLE PRECISION,
    "ventasPeriodo" DOUBLE PRECISION,
    "ventasPromDiaria" DOUBLE PRECISION,
    "leadTimeDias" DOUBLE PRECISION,
    "demandaLeadTime" DOUBLE PRECISION,
    "tendencia7dVsPrev7d" DOUBLE PRECISION,
    "tendenciaYoYMes" DOUBLE PRECISION,
    "externos" JSONB,
    "cantidadSugerida" DOUBLE PRECISION,
    "cantidadFinal" DOUBLE PRECISION,
    "fueEditadoManual" BOOLEAN NOT NULL DEFAULT false,
    "lastPurchasePrice" DOUBLE PRECISION,

    CONSTRAINT "CompraPedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProveedorSkuAlias_proveedorId_idx" ON "ProveedorSkuAlias"("proveedorId");

-- CreateIndex
CREATE INDEX "ProveedorSkuAlias_productoId_idx" ON "ProveedorSkuAlias"("productoId");

-- CreateIndex
CREATE INDEX "ProveedorSkuAlias_presentacionId_idx" ON "ProveedorSkuAlias"("presentacionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProveedorSkuAlias_proveedorId_productoId_presentacionId_key" ON "ProveedorSkuAlias"("proveedorId", "productoId", "presentacionId");

-- CreateIndex
CREATE UNIQUE INDEX "CompraPedido_numero_key" ON "CompraPedido"("numero");

-- CreateIndex
CREATE INDEX "CompraPedido_proveedorId_idx" ON "CompraPedido"("proveedorId");

-- CreateIndex
CREATE INDEX "CompraPedido_pedidoId_idx" ON "CompraPedido"("pedidoId");

-- CreateIndex
CREATE INDEX "CompraPedidoItem_compraPedidoId_idx" ON "CompraPedidoItem"("compraPedidoId");

-- CreateIndex
CREATE INDEX "CompraPedidoItem_proveedorId_idx" ON "CompraPedidoItem"("proveedorId");

-- CreateIndex
CREATE INDEX "CompraPedidoItem_productoId_idx" ON "CompraPedidoItem"("productoId");

-- CreateIndex
CREATE INDEX "CompraPedidoItem_presentacionId_idx" ON "CompraPedidoItem"("presentacionId");

-- AddForeignKey
ALTER TABLE "ProveedorSkuAlias" ADD CONSTRAINT "ProveedorSkuAlias_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorSkuAlias" ADD CONSTRAINT "ProveedorSkuAlias_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProveedorSkuAlias" ADD CONSTRAINT "ProveedorSkuAlias_presentacionId_fkey" FOREIGN KEY ("presentacionId") REFERENCES "Presentaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraPedido" ADD CONSTRAINT "CompraPedido_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraPedidoItem" ADD CONSTRAINT "CompraPedidoItem_compraPedidoId_fkey" FOREIGN KEY ("compraPedidoId") REFERENCES "CompraPedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraPedidoItem" ADD CONSTRAINT "CompraPedidoItem_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraPedidoItem" ADD CONSTRAINT "CompraPedidoItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraPedidoItem" ADD CONSTRAINT "CompraPedidoItem_presentacionId_fkey" FOREIGN KEY ("presentacionId") REFERENCES "Presentaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
