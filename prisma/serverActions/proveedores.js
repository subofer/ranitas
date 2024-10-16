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

export async function obtenerProductosPorProveedor(proveedorId) {
  if(proveedorId){

    const productosRelacionados = await prisma.productoProveedor.findMany({
      where: {
      proveedorId: proveedorId,
    },
    include: {
      producto: true, // Trae los detalles del producto
    },
  });

  return productosRelacionados;
  }
  return []
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
