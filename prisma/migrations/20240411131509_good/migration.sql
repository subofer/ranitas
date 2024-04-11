-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA');

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
    "idCategoria" TEXT,
    "size" DOUBLE PRECISION,
    "unidad" TEXT,
    "imagen" TEXT,

    CONSTRAINT "Productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedores" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cuit" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL DEFAULT '0800-completar-telefono',
    "email" TEXT NOT NULL DEFAULT 'completar@email.com',
    "persona" TEXT,
    "iva" TEXT,
    "interno" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documentos" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idProveedor" TEXT NOT NULL,
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
CREATE TABLE "Precios" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "precio" DOUBLE PRECISION NOT NULL,
    "idProducto" TEXT NOT NULL,

    CONSTRAINT "Precios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductosToProveedores" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Categorias_nombre_key" ON "Categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Productos_codigoBarra_key" ON "Productos"("codigoBarra");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedores_cuit_key" ON "Proveedores"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "Proveedores_nombre_key" ON "Proveedores"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Documentos_idProveedor_numeroDocumento_key" ON "Documentos"("idProveedor", "numeroDocumento");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductosToProveedores_AB_unique" ON "_ProductosToProveedores"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductosToProveedores_B_index" ON "_ProductosToProveedores"("B");

-- AddForeignKey
ALTER TABLE "Productos" ADD CONSTRAINT "Productos_idCategoria_fkey" FOREIGN KEY ("idCategoria") REFERENCES "Categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documentos" ADD CONSTRAINT "Documentos_idProveedor_fkey" FOREIGN KEY ("idProveedor") REFERENCES "Proveedores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDocumento" ADD CONSTRAINT "DetalleDocumento_docRelacionado_fkey" FOREIGN KEY ("docRelacionado") REFERENCES "Documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleDocumento" ADD CONSTRAINT "DetalleDocumento_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Precios" ADD CONSTRAINT "Precios_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductosToProveedores" ADD CONSTRAINT "_ProductosToProveedores_A_fkey" FOREIGN KEY ("A") REFERENCES "Productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductosToProveedores" ADD CONSTRAINT "_ProductosToProveedores_B_fkey" FOREIGN KEY ("B") REFERENCES "Proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
