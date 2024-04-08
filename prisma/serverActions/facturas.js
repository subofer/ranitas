'use server'
import prisma from "../prisma";

// Las categorias se guardaran con la primer letra en mayusculas.
export async function guardarFactura(formData) {
  // Desestructuración para extraer los campos de formData
  console.log(formData)
  const { idProveedor, numeroFactura, fecha, tieneImpuestos, detalles } = formData;

  // Transformar los detalles a la estructura esperada por Prisma
  const detallesTransformados = detalles.map(({ idProducto, cantidad, precioUnitario }) => ({
    productoProvId: idProducto, // Asumiendo que productoProvId es el campo correcto
    cantidad: parseInt(cantidad, 10),
    precioUnitario: parseFloat(precioUnitario),
  }));

  try {
    const facturaCreada = await prisma.facturas.create({
      data: {
        proveedorId: idProveedor,
        numeroFactura,
        fecha: new Date(fecha), // Asegurarse de que la fecha esté en formato correcto
        tieneImpuestos,
        detalles: {
          create: detallesTransformados,
        },
      },
    });

    console.log('Factura guardada con éxito:', facturaCreada);
    return facturaCreada;
  } catch (error) {
    console.error('Error guardando factura:', error);
    throw error; // O manejar el error de manera más específica
  }
}

export async function guardarFacturaConStock(formData) {
  const { idProveedor, numeroFactura, fecha, tieneImpuestos, detalles } = formData;

  const detallesTransformados = detalles.map(({ idProducto, cantidad, precioUnitario }) => ({
    productoProvId: idProducto,
    cantidad: parseInt(cantidad, 10),
    precioUnitario: parseFloat(precioUnitario),
  }));

  // Iniciar una transacción para asegurarse de que todo se guarde de manera atómica
  const transaction = await prisma.$transaction(async (prisma) => {
    try {
      const facturaCreada = await prisma.facturas.create({
        data: {
          proveedorId: idProveedor,
          numeroFactura,
          fecha: new Date(fecha),
          tieneImpuestos,
          detalles: {
            create: detallesTransformados,
          },
        },
      });

      // Crear los movimientos de stock basados en los detalles de la factura
      await Promise.all(detallesTransformados.map(async ({ productoProvId, cantidad }) => {
        await prisma.movimientosStock.create({
          data: {
            productoId: productoProvId, // Asegúrate de que este sea el campo correcto para referenciar el producto
            cantidad,
            tipoMovimiento: 'INGRESO', // Asumiendo que tienes un campo para indicar el tipo de movimiento
            fecha: new Date(fecha),
            facturaId: facturaCreada.id, // Relacionar el movimiento con la factura creada
          },
        });
      }));

      console.log('Factura y movimientos de stock guardados con éxito');
      return facturaCreada;
    } catch (error) {
      console.error('Error guardando factura y movimientos de stock:', error);
      throw error; // O manejar el error de manera más específica
    }
  });

  return transaction;
}
