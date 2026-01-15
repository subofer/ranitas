-- CreateTable
CREATE TABLE "Pagos" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idDocumento" TEXT NOT NULL,
    "formaPago" "FormaPago" NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observaciones" TEXT,

    CONSTRAINT "Pagos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Pagos" ADD CONSTRAINT "Pagos_idDocumento_fkey" FOREIGN KEY ("idDocumento") REFERENCES "Documentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
