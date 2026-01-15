"use server"

import formToObject from "@/lib/formToObject";
import { createAuditLog } from "@/lib/actions/audit";


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

export async function agregarProveedorAPresentacion(proveedorId, presentacionId, sku = '', nombreEnProveedor = '') {
  const relacion = await prisma.proveedorSkuAlias.create({
    data: {
      proveedorId: proveedorId,
      presentacionId: presentacionId,
      sku: sku,
      nombreEnProveedor: nombreEnProveedor,
    },
  });

  await createAuditLog({
    level: 'INFO',
    category: 'DB',
    action: 'CREATE_PROVEEDOR_PRESENTACION',
    message: `Asignado proveedor ${proveedorId} a presentación ${presentacionId} con SKU ${sku}`,
    metadata: { proveedorId, presentacionId, sku, nombreEnProveedor },
  });

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
