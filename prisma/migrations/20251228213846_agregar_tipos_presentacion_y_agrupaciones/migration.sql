-- Crear tabla TiposPresentacion primero
CREATE TABLE "TiposPresentacion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "TiposPresentacion_pkey" PRIMARY KEY ("id")
);

-- Crear tipos básicos por defecto
INSERT INTO "TiposPresentacion" ("id", "nombre", "descripcion") VALUES
(gen_random_uuid()::text, 'unidad', 'Unidad individual'),
(gen_random_uuid()::text, 'caja', 'Caja contenedora'),
(gen_random_uuid()::text, 'bolsa', 'Bolsa contenedora'),
(gen_random_uuid()::text, 'botella', 'Botella individual'),
(gen_random_uuid()::text, 'paquete', 'Paquete'),
(gen_random_uuid()::text, 'pallet', 'Pallet'),
(gen_random_uuid()::text, 'granel', 'A granel');

-- Crear índice único
CREATE UNIQUE INDEX "TiposPresentacion_nombre_key" ON "TiposPresentacion"("nombre");

-- Agregar columnas nuevas a Presentaciones (temporalmente nullable)
ALTER TABLE "Presentaciones" 
ADD COLUMN "cantidad" DOUBLE PRECISION,
ADD COLUMN "contenidoPorUnidad" DOUBLE PRECISION,
ADD COLUMN "tipoPresentacionId" TEXT,
ADD COLUMN "unidadContenido" TEXT;

-- Migrar datos existentes: copiar cantidadUnidad a cantidad y asignar tipo por defecto
UPDATE "Presentaciones" 
SET 
    "cantidad" = COALESCE("cantidadUnidad", 1),
    "tipoPresentacionId" = (SELECT "id" FROM "TiposPresentacion" WHERE "nombre" = 'unidad' LIMIT 1)
WHERE "cantidad" IS NULL;

-- Hacer las columnas NOT NULL ahora que tienen datos
ALTER TABLE "Presentaciones" 
ALTER COLUMN "cantidad" SET NOT NULL,
ALTER COLUMN "tipoPresentacionId" SET NOT NULL;

-- Eliminar columna antigua
ALTER TABLE "Presentaciones" DROP COLUMN "cantidadUnidad";

-- Crear tabla AgrupacionPresentaciones
CREATE TABLE "AgrupacionPresentaciones" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "presentacionContenidaId" TEXT NOT NULL,
    "presentacionContenedoraId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AgrupacionPresentaciones_pkey" PRIMARY KEY ("id")
);

-- Crear índice único para AgrupacionPresentaciones
CREATE UNIQUE INDEX "AgrupacionPresentaciones_presentacionContenidaId_presentaci_key" ON "AgrupacionPresentaciones"("presentacionContenidaId", "presentacionContenedoraId");

-- Agregar foreign keys
ALTER TABLE "Presentaciones" ADD CONSTRAINT "Presentaciones_tipoPresentacionId_fkey" FOREIGN KEY ("tipoPresentacionId") REFERENCES "TiposPresentacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AgrupacionPresentaciones" ADD CONSTRAINT "AgrupacionPresentaciones_presentacionContenidaId_fkey" FOREIGN KEY ("presentacionContenidaId") REFERENCES "Presentaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AgrupacionPresentaciones" ADD CONSTRAINT "AgrupacionPresentaciones_presentacionContenedoraId_fkey" FOREIGN KEY ("presentacionContenedoraId") REFERENCES "Presentaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
