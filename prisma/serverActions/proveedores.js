"use server"

import prisma from "../prisma";
import formToObject from "@/lib/formToObject";
import { createAuditLog } from "@/lib/actions/audit";
import { getSession } from "@/lib/sesion/sesion";
import { revalidatePath } from "next/cache";


export async function getProveedorConProducto(proveedorId, productoId) {
  const relacion = await prisma.productoProveedor.findUnique({
    where: {
      proveedorId_productoId: {
        proveedorId: proveedorId,
        productoId: productoId,
      },
    },
  });
  return relacion;
}

export async function editarNombreProductoProveedor(formData) {
  const {proveedorId, productoId, nuevoCodigo} = formToObject(formData)

  const relacionActualizada = await prisma.productoProveedor.update({
    where: {
      proveedorId_productoId: {
        proveedorId: proveedorId,
        productoId: productoId,
      },
    },
    data: {
      codigo: nuevoCodigo,
    },
  });

  return relacionActualizada;
}

export async function obtenerProductosPorProveedor(proveedorId, { skip = 0, take = 50 } = {}) {
  if (proveedorId) {
    const [productosRelacionados, total] = await Promise.all([
      prisma.productoProveedor.findMany({
        where: {
          proveedorId: proveedorId,
        },
        skip,
        take,
        include: {
          producto: true, // Trae los detalles del producto
        },
      }),
      prisma.productoProveedor.count({
        where: {
          proveedorId: proveedorId,
        },
      }),
    ]);

    return { productosRelacionados, total };
  }
  return { productosRelacionados: [], total: 0 }
}

export async function obtenerPresentacionesPorProveedor(proveedorId, { skip = 0, take = 50 } = {}) {
  if (proveedorId) {
    const [presentacionesRelacionadas, total] = await Promise.all([
      prisma.proveedorSkuAlias.findMany({
        where: {
          proveedorId: proveedorId,
        },
        skip,
        take,
        include: {
          presentacion: {
            include: {
              producto: true,
              tipoPresentacion: true,
            },
          },
        },
      }),
      prisma.proveedorSkuAlias.count({
        where: {
          proveedorId: proveedorId,
        },
      }),
    ]);

    return {
      presentacionesRelacionadas,
      total,
    };
  }
  return { presentacionesRelacionadas: [], total: 0 };
}

export async function eliminarRelacionProductoProveedor(proveedorId, productoId) {
  const resultado = await prisma.productoProveedor.delete({
    where: {
      proveedorId_productoId: {
        proveedorId: proveedorId,
        productoId: productoId,
      },
    },
  });

  return resultado;
}

export async function agregarProductoAProveedor(proveedorId, productoId, codigo = '') {
  // Verificar si ya existe la relación
  const relacionExistente = await prisma.productoProveedor.findUnique({
    where: {
      proveedorId_productoId: {
        proveedorId: proveedorId,
        productoId: productoId,
      },
    },
  });

  if (relacionExistente) {
    // Si ya existe, actualizar el código si es diferente
    if (relacionExistente.codigo !== codigo) {
      const relacionActualizada = await prisma.productoProveedor.update({
        where: {
          proveedorId_productoId: {
            proveedorId: proveedorId,
            productoId: productoId,
          },
        },
        data: {
          codigo: codigo,
        },
      });
      return relacionActualizada;
    }
    return relacionExistente;
  }

  // Si no existe, crear la relación
  const relacion = await prisma.productoProveedor.create({
    data: {
      proveedorId: proveedorId,
      productoId: productoId,
      codigo: codigo,
    },
  });

  return relacion;
}

export async function obtenerProveedoresPorPresentacion(presentacionId) {
  if (presentacionId) {
    const proveedoresRelacionados = await prisma.proveedorSkuAlias.findMany({
      where: {
        presentacionId: presentacionId,
      },
      include: {
        proveedor: true,
      },
    });

    return proveedoresRelacionados;
  }
  return [];
}

export async function agregarProveedorAPresentacion(proveedorId, presentacionId, nombreEnProveedor = '') {
  const session = await getSession();
  const userId = session?.user || "Sistema";

  // Usar presentacionId como sku interno (no expuesto en UI)
  const effectiveSku = presentacionId;
  
  const relacion = await prisma.proveedorSkuAlias.upsert({
    where: {
      proveedorId_sku: {
        proveedorId: proveedorId,
        sku: effectiveSku,
      },
    },
    update: {
      presentacionId: presentacionId,
      nombreEnProveedor: nombreEnProveedor,
    },
    create: {
      proveedorId: proveedorId,
      presentacionId: presentacionId,
      sku: effectiveSku,
      nombreEnProveedor: nombreEnProveedor,
    },
    include: {
      presentacion: {
        include: {
          producto: { select: { nombre: true } },
        },
      },
      proveedor: { select: { nombre: true } },
    },
  });

  // Si no se proporcionó nombreEnProveedor, crear un pendiente
  if (!nombreEnProveedor) {
    const productoNombre = relacion.presentacion?.producto?.nombre || 'Producto desconocido';
    const presentacionNombre = relacion.presentacion?.nombre || '';
    const proveedorNombre = relacion.proveedor?.nombre || 'Proveedor';
    
    // Verificar si ya existe un pendiente para esta relación
    const yaExiste = await prisma.correccionPendiente.findFirst({
      where: {
        estado: 'ABIERTO',
        tipo: 'ALIAS_PRESENTACION_PROVEEDOR',
        payload: {
          path: ['relacionId'],
          equals: relacion.id,
        },
      },
      select: { id: true },
    });

    if (!yaExiste) {
      await prisma.correccionPendiente.create({
        data: {
          tipo: 'ALIAS_PRESENTACION_PROVEEDOR',
          titulo: `Configurar alias: ${productoNombre} - ${presentacionNombre}`,
          descripcion: `Agregar nombre en proveedor "${proveedorNombre}" para: ${productoNombre} - ${presentacionNombre}`,
          entidadTipo: 'ProveedorSkuAlias',
          entidadId: relacion.id,
          contexto: 'PRODUCTOS_PROVEEDOR',
          payload: {
            relacionId: relacion.id,
            proveedorId,
            presentacionId,
            productoNombre,
            presentacionNombre,
            proveedorNombre,
          },
          creadoPor: userId,
        },
      });
    }
  }

  await createAuditLog({
    level: 'INFO',
    category: 'DB',
    action: 'UPSERT_PROVEEDOR_PRESENTACION',
    message: `Proveedor ${proveedorId} asignado/actualizado para presentación ${presentacionId}`,
    metadata: { proveedorId, presentacionId, nombreEnProveedor },
  });

  revalidatePath('/pendientes');
  revalidatePath('/productosProveedor');

  return relacion;
}

export async function eliminarProveedorDePresentacion(proveedorId, presentacionId) {
  const resultado = await prisma.proveedorSkuAlias.deleteMany({
    where: {
      proveedorId: proveedorId,
      presentacionId: presentacionId,
    },
  });

  await createAuditLog({
    level: 'INFO',
    category: 'DB',
    action: 'DELETE_PROVEEDOR_PRESENTACION',
    message: `Eliminado proveedor ${proveedorId} de presentación ${presentacionId}`,
    metadata: { proveedorId, presentacionId },
  });

  return resultado;
}

export async function actualizarProveedorSkuAlias(proveedorId, relacionId, nombreEnProveedor) {
  const session = await getSession();
  const userId = session?.user || "Sistema";

  // Obtener la relación por ID (alias del proveedor)
  const relacion = await prisma.proveedorSkuAlias.findFirst({
    where: {
      id: relacionId,
      proveedorId: proveedorId,
    },
    select: { id: true },
  });

  if (!relacion) {
    throw new Error(`Relación no encontrada para proveedorId: ${proveedorId}, relacionId: ${relacionId}`);
  }

  const relacionActualizada = await prisma.proveedorSkuAlias.updateMany({
    where: {
      id: relacionId,
      proveedorId: proveedorId,
    },
    data: {
      nombreEnProveedor: nombreEnProveedor || '',
    },
  });

  // Si se proporcionó nombreEnProveedor, resolver cualquier pendiente asociado
  if (nombreEnProveedor && relacion?.id) {
    await prisma.correccionPendiente.updateMany({
      where: {
        estado: 'ABIERTO',
        tipo: 'ALIAS_PRESENTACION_PROVEEDOR',
        payload: {
          path: ['relacionId'],
          equals: relacion.id,
        },
      },
      data: {
        estado: 'RESUELTO',
        resueltoAt: new Date(),
        resueltoPor: userId,
        notasResolucion: `Alias configurado: ${nombreEnProveedor}`,
      },
    });
  }

  await createAuditLog({
    level: 'INFO',
    category: 'DB',
    action: 'UPDATE_PROVEEDOR_SKU_ALIAS',
    message: `Actualizado alias para proveedor ${proveedorId}`,
    metadata: { proveedorId, relacionId, nombreEnProveedor },
  });

  revalidatePath('/pendientes');
  revalidatePath('/productosProveedor');

  return relacionActualizada;

  return relacionActualizada;
}
