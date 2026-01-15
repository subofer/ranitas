"use server"

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDocumentTypes() {
  try {
    console.log('🌱 Poblando tipos de documento...');

    // Crear tipos de documento
    const tiposDocumento = [
      { codigo: 'FACTURA_A', nombre: 'Factura A', descripcion: 'Factura tipo A con IVA' },
      { codigo: 'FACTURA_B', nombre: 'Factura B', descripcion: 'Factura tipo B con IVA' },
      { codigo: 'FACTURA_C', nombre: 'Factura C', descripcion: 'Factura tipo C sin IVA' },
      { codigo: 'REMITO', nombre: 'Remito', descripcion: 'Documento de entrega sin valor fiscal' },
      { codigo: 'PRESUPUESTO', nombre: 'Presupuesto', descripcion: 'Documento de presupuesto' },
      { codigo: 'CONTEO', nombre: 'Conteo', descripcion: 'Documento de conteo de inventario' }
    ];

    for (const tipo of tiposDocumento) {
      await prisma.tiposDocumento.upsert({
        where: { codigo: tipo.codigo },
        update: tipo,
        create: tipo
      });
    }

    // Crear estados de documento
    const estadosDocumento = [
      { codigo: 'IMPAGA', nombre: 'Impaga', descripcion: 'Factura pendiente de pago' },
      { codigo: 'PAGA', nombre: 'Paga', descripcion: 'Factura completamente pagada' },
      { codigo: 'PARCIAL', nombre: 'Parcial', descripcion: 'Factura parcialmente pagada' }
    ];

    for (const estado of estadosDocumento) {
      await prisma.estadosDocumento.upsert({
        where: { codigo: estado.codigo },
        update: estado,
        create: estado
      });
    }

    console.log('✅ Tipos y estados de documento poblados correctamente');
    return { success: true };
  } catch (error) {
    console.error('❌ Error poblando tipos de documento:', error);
    return { success: false, error: error.message };
  }
}