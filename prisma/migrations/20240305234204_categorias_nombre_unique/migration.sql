/*
  Warnings:

  - A unique constraint covering the columns `[nombre]` on the table `Categorias` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Categorias_nombre_key" ON "Categorias"("nombre");
