"use server"

import prisma from "../prisma";

// Función para obtener opciones de tipo de documento
export async function getTipoDocumentoOptions() {
  try {
    const tipos = await prisma.tiposDocumento.findMany({
      where: { activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true
      },
      orderBy: { nombre: 'asc' }
    });

    return tipos.map(tipo => ({
      id: tipo.id,
      nombre: tipo.nombre,
      codigo: tipo.codigo
    }));
  } catch (error) {
    console.error('Error obteniendo tipos de documento:', error);
    // Fallback a valores hardcodeados si no hay datos en la tabla
    return [
      { id: 'fallback_factura_a', nombre: 'Factura A' },
      { id: 'fallback_factura_b', nombre: 'Factura B' },
      { id: 'fallback_factura_c', nombre: 'Factura C' },
      { id: 'fallback_remito', nombre: 'Remito' },
      { id: 'fallback_presupuesto', nombre: 'Presupuesto' },
      { id: 'fallback_conteo', nombre: 'Conteo' }
    ];
  }
}

// Función para obtener opciones de estado de documento
export async function getEstadoDocumentoOptions() {
  try {
    const estados = await prisma.estadosDocumento.findMany({
      where: { activo: true },
      select: {
        id: true,
        codigo: true,
        nombre: true
      },
      orderBy: { nombre: 'asc' }
    });

    return estados.map(estado => ({
      id: estado.id,
      nombre: estado.nombre,
      codigo: estado.codigo
    }));
  } catch (error) {
    console.error('Error obteniendo estados de documento:', error);
    // Fallback a valores hardcodeados si no hay datos en la tabla
    return [
      { id: 'fallback_impaga', nombre: 'Impaga' },
      { id: 'fallback_paga', nombre: 'Paga' },
      { id: 'fallback_parcial', nombre: 'Parcial' }
    ];
  }
}