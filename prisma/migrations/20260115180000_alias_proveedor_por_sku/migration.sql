-- Ajuste de unicidades para ProveedorSkuAlias:
-- 1) El alias se identifica por proveedor + sku (flujo "tal cual viene")
-- 2) Permite mapear opcionalmente a presentacionId, manteniendo único proveedor+presentacion

-- Por compatibilidad: eliminar constraint/index único anterior si existía.
-- (El nombre puede variar entre instalaciones; cubrimos el caso más común.)
DROP INDEX IF EXISTS "ProveedorSkuAlias_proveedorId_productoId_presentacionId_key";

-- Unicidad principal: proveedor + sku
CREATE UNIQUE INDEX IF NOT EXISTS "ProveedorSkuAlias_proveedorId_sku_key"
ON "ProveedorSkuAlias" ("proveedorId", "sku");

-- Unicidad para mapeo: un proveedor no puede apuntar dos veces a la misma presentación
CREATE UNIQUE INDEX IF NOT EXISTS "ProveedorSkuAlias_proveedorId_presentacionId_key"
ON "ProveedorSkuAlias" ("proveedorId", "presentacionId")
;
