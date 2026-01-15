-- CreateEnum
CREATE TYPE "CorreccionPendienteEstado" AS ENUM ('ABIERTO', 'RESUELTO');

-- CreateEnum
CREATE TYPE "CorreccionPendienteTipo" AS ENUM ('MAPEAR_ITEM_FACTURA', 'ALIAS_PRESENTACION_PROVEEDOR', 'DATO_FALTANTE');

-- CreateTable
CREATE TABLE "CorreccionPendiente" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "estado" "CorreccionPendienteEstado" NOT NULL DEFAULT 'ABIERTO',
    "tipo" "CorreccionPendienteTipo" NOT NULL,

    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,

    "entidadTipo" TEXT,
    "entidadId" TEXT,
    "contexto" TEXT,

    "payload" JSONB,

    "creadoPor" TEXT,
    "resueltoAt" TIMESTAMP(3),
    "resueltoPor" TEXT,
    "notasResolucion" TEXT,

    CONSTRAINT "CorreccionPendiente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorreccionPendiente_estado_idx" ON "CorreccionPendiente"("estado");

-- CreateIndex
CREATE INDEX "CorreccionPendiente_tipo_idx" ON "CorreccionPendiente"("tipo");

-- CreateIndex
CREATE INDEX "CorreccionPendiente_createdAt_idx" ON "CorreccionPendiente"("createdAt");

-- AlterTable
ALTER TABLE "DetallePedidos" ADD COLUMN "presentacionId" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "DetallePedidos_idPedido_idProducto_key";

-- CreateIndex
CREATE UNIQUE INDEX "DetallePedidos_idPedido_idProducto_presentacionId_key" ON "DetallePedidos"("idPedido", "idProducto", "presentacionId");

-- AddForeignKey
ALTER TABLE "DetallePedidos" ADD CONSTRAINT "DetallePedidos_presentacionId_fkey" FOREIGN KEY ("presentacionId") REFERENCES "Presentaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
