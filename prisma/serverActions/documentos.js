"use server";
import { getLastDocumentosVenta } from "../consultas/documentos";
import prisma from "../prisma";
import { auditAction } from "@/lib/actions/audit";
import { getSession } from "@/lib/sesion/sesion";

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

  if (!idProveedor) throw new Error("Falta proveedor (idProveedor)");

  const contactoInterno = await prisma.contactos.findFirst({
    where: { esInterno: true },
    select: { id: true },
  });

  if (!contactoInterno?.id) {
    throw new Error("Falta configurar un contacto interno (Contactos.esInterno=true) para registrar el documento.");
  }

  const normalizarNumero = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const detallesTransformados = (detalles || []).map((d) => {
    const cantidad = normalizarNumero(d?.cantidad, 0);
    const precioUnitario = normalizarNumero(d?.precioUnitario, 0);
    const descuento = Math.max(0, normalizarNumero(d?.descuento, 0));
    return {
      idProducto: d?.idProducto,
      cantidad,
      precioUnitario,
      presentacionId: d?.presentacionId || null,
      descuento,
    };
  });

  const subtotal = detallesTransformados.reduce((acc, d) => {
    const line = Math.max(0, (d.precioUnitario * d.cantidad) - d.descuento);
    return acc + line;
  }, 0);

  const totalDocumento = subtotal * (tieneImpuestos ? 1.21 : 1);

  const session = await getSession();
  const userId = session?.user || "Sistema";

  const documentoCreado = await prisma.$transaction(async (tx) => {
    const documento = await tx.documentos.create({
      data: {
        idContacto: idProveedor,
        idDestinatario: contactoInterno.id,
        numeroDocumento,
        tipoDocumento,
        tipoMovimiento,
        fecha: new Date(fecha),
        tieneImpuestos,
        total: totalDocumento,
        detalle: {
          create: detallesTransformados
            .filter((d) => Boolean(d.idProducto))
            .map((d) => ({
              idProducto: d.idProducto,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              unidadVenta: d.presentacionId,
              variedad: d.descuento ? `descuento:${d.descuento}` : null,
            })),
        },
      },
      include: { detalle: true },
    });

    const { sumaStock, restaStock, guardaPrecio, seteaStock } = tiposDocumentos[tipoDocumento][tipoMovimiento];

    const idsProducto = [...new Set(documento.detalle.map((d) => d.idProducto).filter(Boolean))];
    const productos = await tx.productos.findMany({
      where: { id: { in: idsProducto } },
      select: {
        id: true,
        nombre: true,
        codigoBarra: true,
        presentaciones: { select: { id: true, esUnidadBase: true } },
      },
    });
    const productoById = new Map(productos.map((p) => [p.id, p]));

    const presentacionesDeDetalles = documento.detalle
      .map((d) => d.unidadVenta)
      .filter(Boolean);

    const presentaciones = await tx.presentaciones.findMany({
      where: { id: { in: presentacionesDeDetalles } },
      select: { id: true, nombre: true, productoId: true, codigoBarra: true },
    });
    const presentacionById = new Map(presentaciones.map((p) => [p.id, p]));

    const auditoriaLineas = [];

    await Promise.all(
      documento.detalle.map(async (detalle) => {
        const producto = productoById.get(detalle.idProducto);
        const baseId = producto?.presentaciones?.find((p) => p.esUnidadBase)?.id ?? null;
        const presentacionId = detalle.unidadVenta || null;
        const esBase = Boolean(baseId && presentacionId && presentacionId === baseId);
        const usaCerrado = Boolean(presentacionId && !esBase);

        const cantidadEntera = Math.trunc(normalizarNumero(detalle.cantidad, 0));
        if (cantidadEntera === 0) return;

        if (guardaPrecio) {
          await tx.precios.create({
            data: { idProducto: detalle.idProducto, precio: detalle.precioUnitario },
          });
        }

        const presentacion = presentacionId ? presentacionById.get(presentacionId) : null;
        const tipoStockDestino = usaCerrado ? "cerrado" : "suelto";

        if (sumaStock) {
          if (usaCerrado) {
            await tx.stockPresentacion.upsert({
              where: { presentacionId },
              update: { stockCerrado: { increment: cantidadEntera } },
              create: { presentacionId, stockCerrado: Math.max(0, cantidadEntera) },
            });
          } else {
            await tx.productos.update({
              where: { id: detalle.idProducto },
              data: { stockSuelto: { increment: cantidadEntera } },
            });
          }
        }

        if (restaStock) {
          const dec = Math.abs(cantidadEntera);
          if (usaCerrado) {
            await tx.stockPresentacion.upsert({
              where: { presentacionId },
              update: { stockCerrado: { decrement: dec } },
              create: { presentacionId, stockCerrado: 0 },
            });
          } else {
            await tx.productos.update({
              where: { id: detalle.idProducto },
              data: { stockSuelto: { decrement: dec } },
            });
          }
        }

        if (seteaStock) {
          const val = Math.max(0, cantidadEntera);
          if (usaCerrado) {
            await tx.stockPresentacion.upsert({
              where: { presentacionId },
              update: { stockCerrado: val },
              create: { presentacionId, stockCerrado: val },
            });
          } else {
            await tx.productos.update({
              where: { id: detalle.idProducto },
              data: { stockSuelto: val },
            });
          }
        }

        auditoriaLineas.push({
          productoId: detalle.idProducto,
          productoNombre: producto?.nombre || null,
          codigoBarra: producto?.codigoBarra || null,
          presentacionId: presentacionId,
          presentacionNombre: presentacion?.nombre || null,
          presentacionCodigoBarra: presentacion?.codigoBarra || null,
          cantidad: cantidadEntera,
          precioUnitario: detalle.precioUnitario,
          destinoStock: tipoStockDestino,
        });
      })
    );

    try {
      const proveedor = await tx.contactos.findUnique({
        where: { id: idProveedor },
        select: { id: true, nombre: true, cuit: true },
      });

      await auditAction({
        level: "SUCCESS",
        action: "DOCUMENTO_GUARDADO",
        message: `${tipoDocumento} ${tipoMovimiento} guardado: ${proveedor?.nombre || 'Proveedor'} #${numeroDocumento} (${documento.detalle.length} items)` ,
        category: "DB",
        metadata: {
          documentoId: documento.id,
          tipoDocumento,
          tipoMovimiento,
          fecha,
          tieneImpuestos,
          total: totalDocumento,
          proveedorId: idProveedor,
          proveedorNombre: proveedor?.nombre || null,
          proveedorCuit: proveedor?.cuit || null,
          destinatarioId: contactoInterno.id,
          lineas: auditoriaLineas,
        },
        userId,
      });
    } catch (e) {
      // no bloquea
      await auditAction({
        level: "WARNING",
        action: "DOCUMENTO_GUARDADO",
        message: `Documento guardado pero falló auditoría: ${e?.message || 'error'}`,
        category: "DB",
        metadata: { documentoId: documento.id, tipoDocumento, tipoMovimiento },
        userId,
      });
    }

    return documento;
  });

  return documentoCreado;
}
