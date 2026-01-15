/*
  Warnings:

  - The values [FACTURA] on the enum `TipoDocumento` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TipoDocumento_new" AS ENUM ('FACTURA_A', 'FACTURA_B', 'FACTURA_C', 'REMITO', 'PRESUPUESTO', 'CONTEO');
ALTER TABLE "Documentos" ALTER COLUMN "tipoDocumento" TYPE "TipoDocumento_new" USING (
  CASE "tipoDocumento"::text
    WHEN 'FACTURA' THEN 'FACTURA_A'::"TipoDocumento_new"
    ELSE "tipoDocumento"::text::"TipoDocumento_new"
  END
);
ALTER TYPE "TipoDocumento" RENAME TO "TipoDocumento_old";
ALTER TYPE "TipoDocumento_new" RENAME TO "TipoDocumento";
DROP TYPE "TipoDocumento_old";
COMMIT;
