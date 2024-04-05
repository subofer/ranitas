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