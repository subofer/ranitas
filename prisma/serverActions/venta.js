"use server";
/*
import { getlastDocumentosVenta } from "../consultas/documentos";
import prisma from "../prisma";

export async function guardarVentaConStock({imagen, ...detalleVenta}) {

  console.log('aca', detalleVenta.map(a => console.log('aca',a )));
  const { numeroDocumento: lastNumeroDocumento } = await getlastDocumentosVenta()
  const nextNumeroDocumento = lastNumeroDocumento ? lastNumeroDocumento + 1 : 1;
  return;
  // Transformar los detalles de la factura a la estructura esperada por Prisma
  const detallesTransformados = detalleVenta.map(
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
        numeroDocumento: nextNumeroDocumento,
        tipoMovimiento: "SALIDA",
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
              decrement: detalle.cantidad,
            },
          },
        });
      })
    );

    return factura;
  });

  return facturaCreada;
}
*/
