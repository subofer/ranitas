"use server";
import prisma from "../prisma";

export async function guardarFacturaConStock(formData) {
  console.log(formData);
  const { idProveedor, numeroDocumento, fecha, tieneImpuestos, detalles } = formData;

  // Transformar los detalles de la factura a la estructura esperada por Prisma
  const detallesTransformados = detalles.map(
    ({ idProducto, cantidad, precioUnitario }) => ({
      idProducto,
      cantidad: parseInt(cantidad, 10),
      precioUnitario: parseFloat(precioUnitario),
    })
  );

  const facturaCreada = await prisma.$transaction(async (prisma) => {
    const factura = await prisma.documentos.create({
      data: {
        idProveedor,
        numeroDocumento,
        tipoMovimiento: "ENTRADA",
        tipoDocumento: tieneImpuestos ? "FACTURA" : "REMITO",
        fecha: new Date(fecha),
        tieneImpuestos,
        total: detallesTransformados.reduce((acc, curr) => acc + curr.precioUnitario * curr.cantidad,0), // Calcular el total de la factura
        detalle: {
          create: detallesTransformados.map((detalle) => ({ ...detalle })),
        },
      },
      include: {
        detalle: true,
      },
    });

    // Iterar sobre los detalles de la factura para actualizar el stock y crear los movimientos de stock
    await Promise.all(
      factura.detalle.map(async (detalle) => {
        // Actualizar el stock del producto
        await prisma.productos.update({
          where: { id: detalle.idProducto },
          data: {
            stock: {
              increment: detalle.cantidad,
            },
          },
        });

        // Actualizar el precio del producto, si es necesario
        await prisma.precios.create({
          data: {
            idProducto: detalle.idProducto,
            precio: detalle.precioUnitario,
          },
        });
      })
    );

    return factura;
  });

  return facturaCreada;
}
