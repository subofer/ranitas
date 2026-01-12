"use server"

import prisma from "@/prisma/prisma";

/**
 * Restaurar un producto que fue eliminado
 * @param {Object} productData - Datos completos del producto a restaurar
 */
export async function restaurarProducto(productData) {
  try {
    const { id, precios, ...productoRest } = productData;
    
    // Recrear el producto
    const productoRestaurado = await prisma.productos.create({
      data: {
        id: id,
        ...productoRest,
      }
    });

    // Recrear los precios si existían
    if (precios && precios.length > 0) {
      await prisma.precios.createMany({
        data: precios.map(p => ({
          idProducto: id,
          precio: p.precio,
          cantidad: p.cantidad,
        }))
      });
    }

    // Auditar restauración
    const { auditAction } = await import("@/lib/actions/audit");
    await auditAction({
      level: 'INFO',
      action: 'RESTAURAR_PRODUCTO',
      message: `Producto restaurado: ${productoRestaurado.nombre}`,
      category: 'DB',
      metadata: { productId: id, productName: productoRestaurado.nombre },
      userId: 'Sistema'
    });

    return { success: true, producto: productoRestaurado };
  } catch (error) {
    console.error('Error restaurando producto:', error);
    return { success: false, error: error.message };
  }
}
