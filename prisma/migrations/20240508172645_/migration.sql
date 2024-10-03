-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA');

-- CreateEnum
CREATE TYPE "TipoVenta" AS ENUM ('GRANEL', 'UNIDAD', 'BULTO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('FACTURA', 'REMITO', 'PRESUPUESTO', 'CONTEO');

-- CreateTable
CREATE TABLE "Categorias" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Productos" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codigoBarra" TEXT NOT NULL,
    "precioActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "size" DOUBLE PRECISION,
    "unidad" TEXT,
    "imagen" TEXT,
    "tipoVenta" "TipoVenta" NOT NULL DEFAULT 'UNIDAD',

    CONSTRAINT "Productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Precios" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precio" DOUBLE PRECISION NOT NULL,
    "idProducto" TEXT NOT NULL,

    CONSTRAINT "Precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documentos" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idContacto" TEXT NOT NULL,
    "idDestinatario" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "tieneImpuestos" BOOLEAN NOT NULL DEFAULT false,
    "tipoDocumento" "TipoDocumento" NOT NULL,
    "tipoMovimiento" "TipoMovimiento" NOT NULL,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleDocumento" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "docRelacionado" TEXT NOT NULL,
    "idProducto" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetalleDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contactos" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cuit" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL DEFAULT '0800-completar-telefono',
    "persona" TEXT,
    "iva" TEXT,
    "esInterno" BOOLEAN NOT NULL DEFAULT false,
    "esProveedor" BOOLEAN NOT NULL DEFAULT false,
    "esMarca" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Contactos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emails" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "idContacto" TEXT NOT NULL,

    CONSTRAINT "Emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Direcciones" (
    "id" TEXT NOT NULL,
    "idContacto" TEXT NOT NULL,
    "idProvincia" TEXT,
    "idLocalidad" TEXT,
    "idCalle" TEXT,
    "idLocalidadCensal" TEXT,
    "numeroCalle" INTEGER,
    "piso" TEXT,
    "depto" TEXT,
    "detalles" TEXT,

    CONSTRAINT "Direcciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provincias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreCompleto" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "isoId" TEXT NOT NULL,
    "isoNombre" TEXT NOT NULL,
    "centroideLat" DOUBLE PRECISION NOT NULL,
    "centroideLon" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Provincias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Localidades" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "idProvincia" TEXT NOT NULL,
    "idDepartamento" TEXT,
    "idMunicipio" TEXT,
    "idLocalidadCensal" TEXT NOT NULL,
    "nombreLocalidadCensal" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "centroideLon" DOUBLE PRECISION NOT NULL,
    "centroideLat" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Localidades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Calles" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "alturas" TEXT NOT NULL,
    "idProvincia" TEXT NOT NULL,
    "idLocalidadCensal" TEXT NOT NULL,

    CONSTRAINT "Calles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoriasToProductos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ContactosToProductos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Categorias_nombre_key" ON "Categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Productos_codigoBarra_key" ON "Productos"("codigoBarra");

-- CreateIndex
CREATE UNIQUE INDEX "Documentos_idContacto_numeroDocumento_key" ON "Documentos"("idContacto", "numeroDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "Contactos_cuit_key" ON "Contactos"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "Contactos_nombre_key" ON "Contactos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Usuarios_nombre_key" ON "Usuarios"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Emails_email_key" ON "Emails"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_CategoriasToProductos_AB_unique" ON "_CategoriasToProductos"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoriasToProductos_B_index" ON "_CategoriasToProductos"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ContactosToProductos_AB_unique" ON "_ContactosToProductos"("A", "B");

-- CreateIndex
CREATE INDEX "_ContactosToProductos_B_index" ON "_ContactosToProductos"("B");

-- AddForeignKey
ALTER TABLE "Precios" ADD CONSTRAINT "Precios_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documentos" ADD CONSTRAINT "Documentos_idContacto_fkey" FOREIGN KEY ("idContacto") REFERENCES "Contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documentos" ADD CONSTRAINT "Documentos_idDestinatario_fkey" FOREIGN KEY ("idDestinatario") REFERENCES "Contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDocumento" ADD CONSTRAINT "DetalleDocumento_docRelacionado_fkey" FOREIGN KEY ("docRelacionado") REFERENCES "Documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDocumento" ADD CONSTRAINT "DetalleDocumento_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Emails" ADD CONSTRAINT "Emails_idContacto_fkey" FOREIGN KEY ("idContacto") REFERENCES "Contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direcciones" ADD CONSTRAINT "Direcciones_idContacto_fkey" FOREIGN KEY ("idContacto") REFERENCES "Contactos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direcciones" ADD CONSTRAINT "Direcciones_idProvincia_fkey" FOREIGN KEY ("idProvincia") REFERENCES "Provincias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direcciones" ADD CONSTRAINT "Direcciones_idLocalidad_fkey" FOREIGN KEY ("idLocalidad") REFERENCES "Localidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Direcciones" ADD CONSTRAINT "Direcciones_idCalle_fkey" FOREIGN KEY ("idCalle") REFERENCES "Calles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Localidades" ADD CONSTRAINT "Localidades_idProvincia_fkey" FOREIGN KEY ("idProvincia") REFERENCES "Provincias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Calles" ADD CONSTRAINT "Calles_idProvincia_fkey" FOREIGN KEY ("idProvincia") REFERENCES "Provincias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoriasToProductos" ADD CONSTRAINT "_CategoriasToProductos_A_fkey" FOREIGN KEY ("A") REFERENCES "Categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoriasToProductos" ADD CONSTRAINT "_CategoriasToProductos_B_fkey" FOREIGN KEY ("B") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactosToProductos" ADD CONSTRAINT "_ContactosToProductos_A_fkey" FOREIGN KEY ("A") REFERENCES "Contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContactosToProductos" ADD CONSTRAINT "_ContactosToProductos_B_fkey" FOREIGN KEY ("B") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
