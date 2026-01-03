-- DropForeignKey
ALTER TABLE "Pedidos" DROP CONSTRAINT "Pedidos_idProveedor_fkey";

-- AlterTable
ALTER TABLE "Pedidos" ALTER COLUMN "idProveedor" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Pedidos" ADD CONSTRAINT "Pedidos_idProveedor_fkey" FOREIGN KEY ("idProveedor") REFERENCES "Contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
