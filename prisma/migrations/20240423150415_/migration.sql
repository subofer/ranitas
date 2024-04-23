/*
  Warnings:

  - You are about to drop the column `interno` on the `Contactos` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Contactos" DROP COLUMN "interno",
ADD COLUMN     "esInterno" BOOLEAN NOT NULL DEFAULT false;
