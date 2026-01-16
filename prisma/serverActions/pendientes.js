"use server";

import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { auditAction } from "@/lib/actions/audit";
import { getSession } from "@/lib/sesion/sesion";

const tiposDocumentos = {
  FACTURA: {
    ENTRADA: { sumaStock: true, guardaPrecio: true },
    SALIDA: { restaStock: true },
  },
  REMITO: {
    ENTRADA: { sumaStock: true, guardaPrecio: true },
    SALIDA: { restaStock: true },
  },
  PRESUPUESTO: {
    ENTRADA: { guardaPrecio: true },
    SALIDA: {},
  },
  CONTEO: {
    ENTRADA: { seteaStock: true },
    SALIDA: { seteaStock: true },
  },
};

const revalidate = () => {
  revalidatePath("/pendientes");
  revalidatePath("/");
};

export const crearPendiente = async ({
  tipo,
  titulo,
  descripcion,
  entidadTipo,
  entidadId,
  contexto,
  payload,
}) => {
  const session = await getSession();
  const userId = session?.user || "Sistema";

  const pendiente = await prisma.correccionPendiente.create({
    data: {
      tipo,
      titulo,
      descripcion,
      entidadTipo,
      entidadId,
      contexto,
      payload,
      creadoPor: userId,
    },
  });

  try {
    await auditAction({
      level: "SUCCESS",
      action: "CREAR_PENDIENTE",
      message: `Pendiente creado: ${pendiente.id} (${tipo})`,
      category: "SYSTEM",
      metadata: { pendienteId: pendiente.id, tipo, entidadTipo, entidadId, contexto },
      userId,
    });
  } catch (_) {
    // No romper el flujo por auditoría
  }

  revalidate();
  return { success: true, pendiente };
};

export const resolverPendiente = async (id, { notas } = {}) => {
  const session = await getSession();
  const userId = session?.user || "Sistema";

  const pendiente = await prisma.correccionPendiente.update({
    where: { id },
    data: {
      estado: "RESUELTO",
      resueltoAt: new Date(),
      resueltoPor: userId,
      notasResolucion: notas || null,
    },
  });

  try {
    await auditAction({
      level: "SUCCESS",
      action: "RESOLVER_PENDIENTE",
      message: `Pendiente resuelto: ${pendiente.id}`,
      category: "SYSTEM",
      metadata: { pendienteId: pendiente.id },
      userId,
    });
  } catch (_) {
    // No romper el flujo por auditoría
  }

  revalidate();
  return { success: true, pendiente };
};

export const getPendientes = async ({ estado } = {}) => {
  const where = {};
  if (estado) where.estado = estado;

  const pendientes = await prisma.correccionPendiente.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return { success: true, pendientes };
};

export const aplicarPendienteFacturaItem = async (idPendiente, { idProducto, presentacionId } = {}) => {
  const session = await getSession();
  const userId = session?.user || "Sistema";

  if (!idPendiente) return { success: false, msg: 'Falta idPendiente' };
  if (!idProducto) return { success: false, msg: 'Falta idProducto' };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const pendiente = await tx.correccionPendiente.findUnique({ where: { id: idPendiente } });
      if (!pendiente) throw new Error('Pendiente no encontrado');
      if (pendiente.estado !== 'ABIERTO') throw new Error('El pendiente ya no está abierto');
      if (pendiente.tipo !== 'MAPEAR_ITEM_FACTURA') throw new Error('Este pendiente no es de tipo MAPEAR_ITEM_FACTURA');

      const payload = pendiente.payload || {};
      const documentoId = payload?.documentoId;
      if (!documentoId) throw new Error('Pendiente sin documentoId en payload');

      const documento = await tx.documentos.findUnique({
        where: { id: documentoId },
        select: { id: true, tipoDocumento: true, tipoMovimiento: true, numeroDocumento: true },
      });
      if (!documento) throw new Error('Documento no encontrado');

      const cantidad = Number(payload?.cantidad ?? 0);
      const precioUnitario = Number(payload?.precioUnitario ?? 0);
      const descuento = Math.max(0, Number(payload?.descuento ?? 0));
      const cantidadEntera = Math.trunc(Number.isFinite(cantidad) ? cantidad : 0);
      if (cantidadEntera === 0) throw new Error('Cantidad inválida en pendiente');

      const detalleDocumento = await tx.detalleDocumento.create({
        data: {
          docRelacionado: documento.id,
          idProducto,
          cantidad,
          precioUnitario,
          unidadVenta: presentacionId || null,
          variedad: descuento ? `descuento:${descuento}` : null,
        },
        select: { id: true, idProducto: true, cantidad: true, precioUnitario: true, unidadVenta: true },
      });

      const reglas = tiposDocumentos?.[documento.tipoDocumento]?.[documento.tipoMovimiento] || {};
      const { sumaStock, restaStock, guardaPrecio, seteaStock } = reglas;

      const producto = await tx.productos.findUnique({
        where: { id: idProducto },
        select: {
          id: true,
          nombre: true,
          codigoBarra: true,
          presentaciones: { select: { id: true, esUnidadBase: true } },
        },
      });
      if (!producto) throw new Error('Producto no encontrado');

      const baseId = producto?.presentaciones?.find((p) => p.esUnidadBase)?.id ?? null;
      const unidadVenta = detalleDocumento.unidadVenta || null;
      const esBase = Boolean(baseId && unidadVenta && unidadVenta === baseId);
      const usaCerrado = Boolean(unidadVenta && !esBase);

      if (guardaPrecio) {
        await tx.precios.create({
          data: { idProducto, precio: detalleDocumento.precioUnitario },
        });
      }

      if (sumaStock) {
        if (usaCerrado) {
          await tx.stockPresentacion.upsert({
            where: { presentacionId: unidadVenta },
            update: { stockCerrado: { increment: cantidadEntera } },
            create: { presentacionId: unidadVenta, stockCerrado: Math.max(0, cantidadEntera) },
          });
        } else {
          await tx.productos.update({
            where: { id: idProducto },
            data: { stockSuelto: { increment: cantidadEntera } },
          });
        }
      }

      if (restaStock) {
        const dec = Math.abs(cantidadEntera);
        if (usaCerrado) {
          await tx.stockPresentacion.upsert({
            where: { presentacionId: unidadVenta },
            update: { stockCerrado: { decrement: dec } },
            create: { presentacionId: unidadVenta, stockCerrado: 0 },
          });
        } else {
          await tx.productos.update({
            where: { id: idProducto },
            data: { stockSuelto: { decrement: dec } },
          });
        }
      }

      if (seteaStock) {
        const val = Math.max(0, cantidadEntera);
        if (usaCerrado) {
          await tx.stockPresentacion.upsert({
            where: { presentacionId: unidadVenta },
            update: { stockCerrado: val },
            create: { presentacionId: unidadVenta, stockCerrado: val },
          });
        } else {
          await tx.productos.update({
            where: { id: idProducto },
            data: { stockSuelto: val },
          });
        }
      }

      const pendienteResuelto = await tx.correccionPendiente.update({
        where: { id: idPendiente },
        data: {
          estado: 'RESUELTO',
          resueltoAt: new Date(),
          resueltoPor: userId,
          entidadTipo: 'DetalleDocumento',
          entidadId: detalleDocumento.id,
          notasResolucion: `Aplicado sobre producto ${producto.nombre} (doc #${documento.numeroDocumento})`,
        },
      });

      return { pendiente: pendienteResuelto, detalleDocumento, documento };
    });

    try {
      await auditAction({
        level: 'SUCCESS',
        action: 'APLICAR_PENDIENTE_ITEM_FACTURA',
        message: `Pendiente aplicado: ${idPendiente}`,
        category: 'DB',
        metadata: {
          pendienteId: idPendiente,
          documentoId: result.documento?.id,
          detalleDocumentoId: result.detalleDocumento?.id,
          productoId: result.detalleDocumento?.idProducto,
          presentacionId: result.detalleDocumento?.unidadVenta || null,
        },
        userId,
      });
    } catch (_) {
      // no romper
    }

    revalidate();
    return { success: true, ...result };
  } catch (e) {
    console.error(e);

    try {
      await auditAction({
        level: 'ERROR',
        action: 'APLICAR_PENDIENTE_ITEM_FACTURA',
        message: e?.message || 'Error aplicando pendiente',
        category: 'DB',
        metadata: { pendienteId: idPendiente, idProducto, presentacionId: presentacionId || null },
        userId,
      });
    } catch (_) {
      // no romper
    }

    return { success: false, msg: e?.message || 'Error aplicando pendiente' };
  }
};

/**
 * Configurar solo el alias (nombreEnProveedor) para un pendiente que ya tiene
 * presentación asignada (viene de agregar producto al proveedor, no de factura)
 */
export const configurarAliasPendiente = async (idPendiente, { nombreEnProveedor } = {}) => {
  const session = await getSession();
  const userId = session?.user || "Sistema";

  if (!idPendiente) return { success: false, msg: 'Falta idPendiente' };
  if (!nombreEnProveedor?.trim()) return { success: false, msg: 'Falta nombreEnProveedor' };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const pendiente = await tx.correccionPendiente.findUnique({ where: { id: idPendiente } });
      if (!pendiente) throw new Error('Pendiente no encontrado');
      if (pendiente.estado !== 'ABIERTO') throw new Error('El pendiente ya no está abierto');
      if (pendiente.tipo !== 'ALIAS_PRESENTACION_PROVEEDOR') throw new Error('Este pendiente no es de tipo ALIAS_PRESENTACION_PROVEEDOR');

      const payload = pendiente.payload || {};
      const relacionId = payload?.relacionId;
      if (!relacionId) throw new Error('Pendiente sin relacionId en payload');

      // Actualizar el nombreEnProveedor en la relación
      const relacion = await tx.proveedorSkuAlias.update({
        where: { id: relacionId },
        data: {
          nombreEnProveedor: nombreEnProveedor.trim(),
        },
        select: { 
          id: true, 
          proveedorId: true, 
          sku: true, 
          nombreEnProveedor: true, 
          presentacionId: true,
          presentacion: {
            select: {
              nombre: true,
              producto: { select: { nombre: true } },
            },
          },
        },
      });

      const pendienteResuelto = await tx.correccionPendiente.update({
        where: { id: idPendiente },
        data: {
          estado: 'RESUELTO',
          resueltoAt: new Date(),
          resueltoPor: userId,
          notasResolucion: `Alias configurado: ${nombreEnProveedor.trim()}`,
        },
      });

      return { pendiente: pendienteResuelto, relacion };
    });

    try {
      await auditAction({
        level: 'SUCCESS',
        action: 'CONFIGURAR_ALIAS_PENDIENTE',
        message: `Alias configurado desde pendiente: ${idPendiente}`,
        category: 'DB',
        metadata: {
          pendienteId: idPendiente,
          relacionId: result.relacion?.id,
          nombreEnProveedor,
        },
        userId,
      });
    } catch (_) {
      // No romper el flujo por auditoría
    }

    revalidate();
    return { success: true, ...result };
  } catch (e) {
    console.error(e);
    return { success: false, msg: e?.message || 'Error configurando alias' };
  }
};

export const aplicarPendienteAliasProveedor = async (idPendiente, { idProducto, presentacionId } = {}) => {
  const session = await getSession();
  const userId = session?.user || "Sistema";

  if (!idPendiente) return { success: false, msg: 'Falta idPendiente' };
  if (!idProducto) return { success: false, msg: 'Falta idProducto' };

  try {
    const result = await prisma.$transaction(async (tx) => {
      const pendiente = await tx.correccionPendiente.findUnique({ where: { id: idPendiente } });
      if (!pendiente) throw new Error('Pendiente no encontrado');
      if (pendiente.estado !== 'ABIERTO') throw new Error('El pendiente ya no está abierto');
      if (pendiente.tipo !== 'ALIAS_PRESENTACION_PROVEEDOR') throw new Error('Este pendiente no es de tipo ALIAS_PRESENTACION_PROVEEDOR');

      const payload = pendiente.payload || {};
      const aliasId = payload?.aliasId;
      if (!aliasId) throw new Error('Pendiente sin aliasId en payload');

      const alias = await tx.proveedorSkuAlias.update({
        where: { id: aliasId },
        data: {
          productoId: idProducto,
          presentacionId: presentacionId || null,
        },
        select: { id: true, proveedorId: true, sku: true, nombreEnProveedor: true, productoId: true, presentacionId: true },
      });

      const producto = await tx.productos.findUnique({
        where: { id: idProducto },
        select: { id: true, nombre: true },
      });

      const pendienteResuelto = await tx.correccionPendiente.update({
        where: { id: idPendiente },
        data: {
          estado: 'RESUELTO',
          resueltoAt: new Date(),
          resueltoPor: userId,
          entidadTipo: 'ProveedorSkuAlias',
          entidadId: alias.id,
          notasResolucion: `Alias mapeado a ${producto?.nombre || 'producto'} (${idProducto})`,
        },
      });

      return { pendiente: pendienteResuelto, alias, producto };
    });

    try {
      await auditAction({
        level: 'SUCCESS',
        action: 'APLICAR_PENDIENTE_ALIAS_PROVEEDOR',
        message: `Pendiente alias aplicado: ${idPendiente}`,
        category: 'DB',
        metadata: {
          pendienteId: idPendiente,
          aliasId: result.alias?.id,
          proveedorId: result.alias?.proveedorId,
          sku: result.alias?.sku,
          productoId: result.alias?.productoId,
          presentacionId: result.alias?.presentacionId || null,
        },
        userId,
      });
    } catch (_) {
      // No romper el flujo por auditoría
    }

    revalidate();
    return { success: true, ...result };
  } catch (e) {
    console.error(e);
    return { success: false, msg: e?.message || 'Error aplicando pendiente' };
  }
};
