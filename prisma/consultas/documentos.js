"use server"
import prisma from "../prisma";

export const getDocumentos = async () => (
  await prisma.documentos.findMany({orderBy: [{createdAt: 'asc'}]})
);

export const getLastDocumentosVenta = async (tipoMovimiento, tipoDocumentoCodigo) => (
  await prisma.documentos.findMany({
    where: {
      tipoMovimiento: tipoMovimiento,
      tipoDocumento: {
        codigo: tipoDocumentoCodigo
      }
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  })
);