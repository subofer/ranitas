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
    // Buscar el ID del tipo de documento
    const tipoDocumentoCodigo = tieneImpuestos ? "FACTURA_A" : "REMITO";
    const tipoDocumentoRecord = await prisma.tiposDocumento.findFirst({
      where: { codigo: tipoDocumentoCodigo }
    });
    
    if (!tipoDocumentoRecord) {
      throw new Error(`Tipo de documento '${tipoDocumentoCodigo}' no encontrado`);
    }

    // Buscar el ID del estado de documento por defecto
    const estadoDocumentoRecord = await prisma.estadosDocumento.findFirst({
      where: { codigo: 'IMPAGA' }
    });
    
    if (!estadoDocumentoRecord) {
      throw new Error(`Estado de documento 'IMPAGA' no encontrado`);
    }

    const factura = await prisma.documentos.create({
      data: {
        idContacto: idProveedor,
        idDestinatario: idProveedor, // Para facturas de compra, emisor y receptor pueden ser el mismo
        numeroDocumento,
        tipoMovimiento: "ENTRADA",
        idTipoDocumento: tipoDocumentoRecord.id,
        idEstadoDocumento: estadoDocumentoRecord.id,
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
            stockSuelto: {
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
