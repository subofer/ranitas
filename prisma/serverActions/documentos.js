"use server";
import { getLastDocumentosVenta } from "../consultas/documentos";
import prisma from "../prisma";

const tiposDocumentos = {
  FACTURA: {
    ENTRADA:{
      sumaStock:true,
      guardaPrecio:true,
    },
    SALIDA:{
      restaStock:true,
    }
  },
  REMITO: {
    ENTRADA:{
      sumaStock:true,
      guardaPrecio:true,
    },
    SALIDA:{
      restaStock:true,
    }
  },
  PRESUPUESTO:{
    ENTRADA:{
      guardaPrecio:true,
    },
    SALIDA:{}
  },
  CONTEO:{
    ENTRADA:{
      seteaStock: true,
    },
    SALIDA:{
      seteaStock: true,
    }
  }
}



export const guardarFacturaCompra = async (formData) => {
  const tipoDocumento = "FACTURA"; const tipoMovimiento = "ENTRADA";

  return await guardarDocumentoConStock(formData, tipoMovimiento, tipoDocumento)
};

export const guardarRemitoCompra = async (formData) => {
  const tipoDocumento = "REMITO"; const tipoMovimiento = "ENTRADA";

  return await guardarDocumentoConStock(formData, tipoMovimiento, tipoDocumento)
};

export const guardarFacturaVenta = async (formData) => {
  const tipoDocumento = "FACTURA"; const tipoMovimiento = "SALIDA";

  const { numeroDocumento } = await getLastDocumentosVenta(tipoMovimiento, tipoDocumento)
  const newNumeroDocumento = formData.numeroDocumento ? formData.numeroDocumento : numeroDocumento + 1;

  return await guardarDocumentoConStock({...formData, numeroDocumento: newNumeroDocumento}, tipoMovimiento, tipoDocumento)
};

export const guardarRemitoVenta = async (formData) => {
  const tipoDocumento = "REMITO"; const tipoMovimiento = "SALIDA";

  const { numeroDocumento } = await getLastDocumentosVenta(tipoMovimiento, tipoDocumento)
  const newNumeroDocumento = formData.numeroDocumento ? formData.numeroDocumento : numeroDocumento + 1;

  return await guardarDocumentoConStock({...formData, numeroDocumento: newNumeroDocumento}, tipoMovimiento, tipoDocumento)
};



export async function guardarDocumentoConStock(formData, tipoMovimiento, tipoDocumento) {
  const { idProveedor, numeroDocumento, fecha, tieneImpuestos, detalles } = formData;

  // Transformar los detalles de la factura a la estructura esperada por Prisma
  const detallesTransformados = detalles.map(
    ({ idProducto, cantidad, precioUnitario }) => ({
      idProducto,
      cantidad: parseInt(cantidad, 10),
      precioUnitario: parseFloat(precioUnitario),
    })
  );

  const documentoCreado = await prisma.$transaction(async (prisma) => {
    const factura = await prisma.documentos.create({
      data: {
        idProveedor,
        numeroDocumento,
        tipoDocumento,
        tipoMovimiento,
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
    const { sumaStock, restaStock, guardaPrecio, seteaStock } = tiposDocumentos[tipoDocumento][tipoMovimiento]
    await Promise.all(
      factura.detalle.map(async (detalle) => {

          guardaPrecio && (await prisma.precios.create({
            data: {
              idProducto: detalle.idProducto,
              precio: detalle.precioUnitario,
            },
          }));

          sumaStock && (await prisma.productos.update({
            where: { id: detalle.idProducto },
            data: {
              stock: {
                increment: detalle.cantidad,
              },
            },
          }));

          restaStock && (await prisma.productos.update({
            where: { id: detalle.idProducto },
            data: {
              stock: {
                decrement: detalle.cantidad,
              },
            },
          }));

          seteaStock && (await prisma.productos.update({
            where: { id: detalle.idProducto },
            data: {
              stock: detalle.cantidad,
            },
          }));

      })
    );

    return factura;
  });

  return documentoCreado;
}
