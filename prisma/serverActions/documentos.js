"use server";
import { getLastDocumentosVenta } from "../consultas/documentos";
import prisma from "../prisma";
import { auditAction } from "@/lib/actions/audit";
import { getSession } from "@/lib/sesion/sesion";

const tiposDocumentos = {
  FACTURA_A: {
    ENTRADA:{
      sumaStock:true,
      guardaPrecio:true,
    },
    SALIDA:{
      restaStock:true,
    }
  },
  FACTURA_B: {
    ENTRADA:{
      sumaStock:true,
      guardaPrecio:true,
    },
    SALIDA:{
      restaStock:true,
    }
  },
  FACTURA_C: {
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
  const tipoDocumento = formData.tipoDocumento || "FACTURA_A";
  const tipoMovimiento = "ENTRADA";

  return await guardarDocumentoConStock(formData, tipoMovimiento, tipoDocumento)
};

export const guardarRemitoCompra = async (formData) => {
  const tipoDocumento = "REMITO"; const tipoMovimiento = "ENTRADA";

  return await guardarDocumentoConStock(formData, tipoMovimiento, tipoDocumento)
};

export const guardarFacturaVenta = async (formData) => {
  const tipoDocumento = formData.tipoDocumento || "FACTURA_A"; const tipoMovimiento = "SALIDA";

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



export async function guardarDocumentoConStock(formData, tipoMovimiento, tipoDocumentoCodigo) {
  const { idProveedor, numeroDocumento, fecha, tieneImpuestos, estado, detalles } = formData;

  if (!idProveedor) throw new Error("Falta proveedor (idProveedor)");

  // Buscar los IDs de tipo y estado de documento
  const tipoDocumentoRecord = await prisma.tiposDocumento.findFirst({
    where: { codigo: tipoDocumentoCodigo }
  });

  if (!tipoDocumentoRecord) {
    throw new Error(`Tipo de documento '${tipoDocumentoCodigo}' no encontrado`);
  }

  const estadoDocumentoRecord = await prisma.estadosDocumento.findFirst({
    where: { codigo: estado || 'IMPAGA' }
  });

  if (!estadoDocumentoRecord) {
    throw new Error(`Estado de documento '${estado || 'IMPAGA'}' no encontrado`);
  }

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
      descripcionPendiente: (d?.descripcionPendiente || d?.descripcionProveedor || '').toString(),
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
        idTipoDocumento: tipoDocumentoRecord.id,
        idEstadoDocumento: estadoDocumentoRecord.id,
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

    // Si se envió una imagen en base64 dentro del formData, guardarla en disco bajo public/uploads/invoices/<documento.id>.*
    try {
      if (formData.imagen) {
        const fs = require('fs')
        const path = require('path')
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'invoices')
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

        // formData.imagen puede ser 'data:<mime>;base64,<data>' o solo base64
        let mime = 'image/jpeg'
        let base64Data = formData.imagen
        const dataUrlMatch = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i.exec(formData.imagen)
        if (dataUrlMatch) {
          mime = dataUrlMatch[1]
          base64Data = dataUrlMatch[3]
        }

        const ext = mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : '.jpg'
        const fileName = `${documento.id}${ext}`
        const filePath = path.join(uploadsDir, fileName)

        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
        console.log('✅ Imagen de factura guardada en:', filePath)
      }
    } catch (e) {
      console.warn('⚠️ No se pudo guardar la imagen de factura en disco:', e.message)
    }

    // Crear pendientes para renglones sin producto (no cortar flujo)
    const pendientesSinProducto = detallesTransformados
      .filter((d) => !d.idProducto)
      .map((d) => {
        const desc = (d.descripcionPendiente || '').trim();
        const cantidad = Number(d.cantidad ?? 0);
        const precioUnitario = Number(d.precioUnitario ?? 0);
        const descuento = Math.max(0, Number(d.descuento ?? 0));

        const tieneAlgo = Boolean(desc) || (Number.isFinite(cantidad) && cantidad > 0) || (Number.isFinite(precioUnitario) && precioUnitario > 0);
        if (!tieneAlgo) return null;

        return {
          tipo: 'MAPEAR_ITEM_FACTURA',
          titulo: `Mapear item de ${tipoDocumento} #${numeroDocumento}`,
          descripcion: desc || null,
          entidadTipo: 'Documentos',
          entidadId: documento.id,
          contexto: 'facturas/carga',
          payload: {
            documentoId: documento.id,
            proveedorId: idProveedor,
            numeroDocumento,
            fecha,
            tipoDocumento,
            tipoMovimiento,
            cantidad,
            precioUnitario,
            descuento,
            descripcionProveedor: desc || null,
          },
          creadoPor: userId,
        };
      })
      .filter(Boolean);

    if (pendientesSinProducto.length > 0) {
      await tx.correccionPendiente.createMany({ data: pendientesSinProducto });
    }

    const { sumaStock, restaStock, guardaPrecio, seteaStock } = tiposDocumentos[tipoDocumentoCodigo][tipoMovimiento];

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
        message: `${tipoDocumentoRecord.nombre} ${tipoMovimiento} guardado: ${proveedor?.nombre || 'Proveedor'} #${numeroDocumento} (${documento.detalle.length} items)` ,
        category: "DB",
        metadata: {
          documentoId: documento.id,
          tipoDocumento: tipoDocumentoRecord.nombre,
          tipoDocumentoCodigo: tipoDocumentoRecord.codigo,
          tipoMovimiento,
          fecha,
          tieneImpuestos,
          total: totalDocumento,
          proveedorId: idProveedor,
          proveedorNombre: proveedor?.nombre || null,
          proveedorCuit: proveedor?.cuit || null,
          destinatarioId: contactoInterno.id,
          lineas: auditoriaLineas,
          pendientesCreados: pendientesSinProducto.length,
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

  return { success: true, documento: documentoCreado };
}

export const cambiarEstadoDocumento = async (documentoId, nuevoEstadoCodigo) => {
  if (!documentoId) throw new Error("Falta documentoId");
  if (!nuevoEstadoCodigo) throw new Error("Falta nuevoEstado");

  const session = await getSession();
  const userId = session?.user || "Sistema";

  const documentoActualizado = await prisma.$transaction(async (tx) => {
    // Buscar el nuevo estado
    const nuevoEstadoRecord = await tx.estadosDocumento.findFirst({
      where: { codigo: nuevoEstadoCodigo }
    });

    if (!nuevoEstadoRecord) {
      throw new Error(`Estado de documento '${nuevoEstadoCodigo}' no encontrado`);
    }

    // Obtener el documento actual para auditoría
    const documentoActual = await tx.documentos.findUnique({
      where: { id: documentoId },
      select: {
        id: true,
        numeroDocumento: true,
        tipoDocumento: { select: { nombre: true, codigo: true } },
        estadoDocumento: { select: { nombre: true, codigo: true } },
        tipoMovimiento: true,
        total: true,
        contactos: { select: { nombre: true, cuit: true } },
      },
    });

    if (!documentoActual) {
      throw new Error(`Documento con id ${documentoId} no encontrado`);
    }

    // Actualizar el estado
    const documento = await tx.documentos.update({
      where: { id: documentoId },
      data: { idEstadoDocumento: nuevoEstadoRecord.id },
      select: {
        id: true,
        numeroDocumento: true,
        tipoDocumento: { select: { nombre: true, codigo: true } },
        estadoDocumento: { select: { nombre: true, codigo: true } },
        tipoMovimiento: true,
        total: true,
      },
    });

    // Registrar auditoría
    try {
      await auditAction({
        level: "INFO",
        action: "ESTADO_DOCUMENTO_CAMBIADO",
        message: `Estado de ${documento.tipoDocumento.nombre} #${documento.numeroDocumento} cambiado de ${documentoActual.estadoDocumento.nombre} a ${nuevoEstadoRecord.nombre}`,
        category: "DB",
        metadata: {
          documentoId: documento.id,
          numeroDocumento: documento.numeroDocumento,
          tipoDocumento: documento.tipoDocumento.nombre,
          tipoDocumentoCodigo: documento.tipoDocumento.codigo,
          tipoMovimiento: documento.tipoMovimiento,
          estadoAnterior: documentoActual.estadoDocumento.nombre,
          estadoAnteriorCodigo: documentoActual.estadoDocumento.codigo,
          estadoNuevo: nuevoEstadoRecord.nombre,
          estadoNuevoCodigo: nuevoEstadoRecord.codigo,
          total: documento.total,
          proveedorNombre: documentoActual.contactos?.nombre || null,
          proveedorCuit: documentoActual.contactos?.cuit || null,
        },
        userId,
      });
    } catch (e) {
      // no bloquea la actualización
      await auditAction({
        level: "WARNING",
        action: "ESTADO_DOCUMENTO_CAMBIADO",
        message: `Estado cambiado pero falló auditoría: ${e?.message || 'error'}`,
        category: "DB",
        metadata: { documentoId: documento.id, estadoNuevo: nuevoEstadoRecord.nombre },
        userId,
      });
    }

    return documento;
  });

  return { success: true, documento: documentoActualizado };
};
