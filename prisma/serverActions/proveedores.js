"use server"

import formToObject from "@/lib/formToObject";


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
