"use server";

import prisma from "../prisma";
import { auditAction } from "@/lib/actions/audit";
import { getSession } from "@/lib/sesion/sesion";

const esNumeroValido = (n) => typeof n === "number" && Number.isFinite(n);

const normalizarEnteroPositivo = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(Math.max(0, n));
};

const calcularFactorAUnidadBase = ({
  desdePresentacionId,
  hastaPresentacionBaseId,
  agrupaciones,
}) => {
  if (desdePresentacionId === hastaPresentacionBaseId) return 1;

  // Grafo dirigido: contenedora -> contenida (multiplica por cantidad)
  const ady = new Map();
  for (const a of agrupaciones) {
    if (!a?.presentacionContenedoraId || !a?.presentacionContenidaId) continue;
    const lista = ady.get(a.presentacionContenedoraId) ?? [];
    lista.push({
      to: a.presentacionContenidaId,
      factor: Number(a.cantidad),
    });
    ady.set(a.presentacionContenedoraId, lista);
  }

  // BFS con acumulación de factor
  const queue = [{ id: desdePresentacionId, factor: 1 }];
  const visited = new Set([desdePresentacionId]);

  while (queue.length > 0) {
    const cur = queue.shift();
    const edges = ady.get(cur.id) ?? [];
    for (const e of edges) {
      if (!esNumeroValido(e.factor) || e.factor <= 0) continue;
      const nextFactor = cur.factor * e.factor;
      if (e.to === hastaPresentacionBaseId) return nextFactor;
      if (visited.has(e.to)) continue;
      visited.add(e.to);
      queue.push({ id: e.to, factor: nextFactor });
    }
  }

  return null;
};

export async function abrirPresentacion({ presentacionId, cantidad } = {}) {
  const cant = normalizarEnteroPositivo(cantidad);
  if (!presentacionId) return { error: true, msg: "Falta presentacionId" };
  if (cant <= 0) return { error: true, msg: "Cantidad inválida" };

  const presentacion = await prisma.presentaciones.findUnique({
    where: { id: presentacionId },
    include: {
      producto: {
        select: {
          id: true,
          stockSuelto: true,
          presentaciones: { select: { id: true, esUnidadBase: true } },
        },
      },
      stock: true,
    },
  });

  if (!presentacion) return { error: true, msg: "Presentación no encontrada" };

  const productoId = presentacion.productoId;
  const base = presentacion.producto?.presentaciones?.find((p) => p.esUnidadBase);
  if (!base) {
    return {
      error: true,
      msg: "Este producto no tiene una presentación marcada como unidad base (esUnidadBase) para poder convertir.",
    };
  }

  const agrupaciones = await prisma.agrupacionPresentaciones.findMany({
    where: {
      OR: [
        { presentacionContenedora: { productoId } },
        { presentacionContenida: { productoId } },
      ],
    },
    select: {
      presentacionContenedoraId: true,
      presentacionContenidaId: true,
      cantidad: true,
    },
  });

  const factor = calcularFactorAUnidadBase({
    desdePresentacionId: presentacionId,
    hastaPresentacionBaseId: base.id,
    agrupaciones,
  });

  if (!esNumeroValido(factor) || factor == null) {
    return {
      error: true,
      msg: "No hay equivalencia definida para convertir esta presentación a unidad base. Configurá AgrupacionPresentaciones (caja→unidad).",
    };
  }

  const unidades = Math.round(cant * factor);
  if (unidades <= 0) {
    return {
      error: true,
      msg: "Equivalencia inválida (unidades resultantes <= 0).",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const stock = await tx.stockPresentacion.findUnique({
        where: { presentacionId },
      });

      const stockSeguro =
        stock ??
        (await tx.stockPresentacion.create({
          data: { presentacionId, stockCerrado: 0 },
        }));

      if (stockSeguro.stockCerrado < cant) {
        throw new Error(`Stock insuficiente. Disponible: ${stockSeguro.stockCerrado}`);
      }

      const stockActualizado = await tx.stockPresentacion.update({
        where: { presentacionId },
        data: { stockCerrado: { decrement: cant } },
      });

      const productoActualizado = await tx.productos.update({
        where: { id: productoId },
        data: { stockSuelto: { increment: unidades } },
        select: { id: true, stockSuelto: true },
      });

      return { stockActualizado, productoActualizado, unidades, factor };
    });

    return {
      error: false,
      msg: "Caja abierta",
      data: result,
    };
  } catch (e) {
    return { error: true, msg: e?.message || "Error abriendo caja" };
  }
}

export async function conteoManualStockSuelto({ productoId, nuevoStockSuelto, motivo = "" } = {}) {
  const cant = normalizarEnteroPositivo(nuevoStockSuelto);
  if (!productoId) return { error: true, msg: "Falta productoId" };

  const session = await getSession();
  const userId = session?.user || "Sistema";

  try {
    const antes = await prisma.productos.findUnique({
      where: { id: productoId },
      select: { id: true, nombre: true, codigoBarra: true, size: true, unidad: true, stockSuelto: true },
    });
    if (!antes) return { error: true, msg: "Producto no encontrado" };

    const actualizado = await prisma.productos.update({
      where: { id: productoId },
      data: { stockSuelto: cant },
      select: { id: true, stockSuelto: true },
    });

    await auditAction({
      level: "SUCCESS",
      action: "CONTEO_MANUAL",
      message: `Conteo manual stock suelto: ${antes.nombre} ${antes.stockSuelto} -> ${cant}`,
      category: "DB",
      metadata: {
        productoId,
        productoNombre: antes.nombre,
        codigoBarra: antes.codigoBarra,
        size: antes.size,
        unidad: antes.unidad,
        stockSueltoAntes: antes.stockSuelto,
        stockSueltoDespues: cant,
        motivo: motivo || null,
      },
      userId,
    });

    return { error: false, msg: "Stock suelto actualizado", data: actualizado };
  } catch (e) {
    await auditAction({
      level: "ERROR",
      action: "CONTEO_MANUAL",
      message: e?.message || "Error en conteo manual stock suelto",
      category: "DB",
      metadata: { productoId, motivo: motivo || null },
      userId,
    });
    return { error: true, msg: e?.message || "Error en conteo manual" };
  }
}

export async function conteoManualStockCerrado({ presentacionId, nuevoStockCerrado, motivo = "" } = {}) {
  const cant = normalizarEnteroPositivo(nuevoStockCerrado);
  if (!presentacionId) return { error: true, msg: "Falta presentacionId" };

  const session = await getSession();
  const userId = session?.user || "Sistema";

  try {
    const presentacion = await prisma.presentaciones.findUnique({
      where: { id: presentacionId },
      select: {
        id: true,
        nombre: true,
        productoId: true,
        producto: { select: { id: true, nombre: true, codigoBarra: true } },
      },
    });
    if (!presentacion) return { error: true, msg: "Presentación no encontrada" };

    const result = await prisma.$transaction(async (tx) => {
      const stockAntes = await tx.stockPresentacion.findUnique({
        where: { presentacionId },
        select: { stockCerrado: true },
      });

      const stockSeguro =
        stockAntes ??
        (await tx.stockPresentacion.create({
          data: { presentacionId, stockCerrado: 0 },
          select: { stockCerrado: true },
        }));

      const actualizado = await tx.stockPresentacion.update({
        where: { presentacionId },
        data: { stockCerrado: cant },
        select: { presentacionId: true, stockCerrado: true },
      });

      return { stockCerradoAntes: stockSeguro.stockCerrado, actualizado };
    });

    await auditAction({
      level: "SUCCESS",
      action: "CONTEO_MANUAL",
      message: `Conteo manual stock cerrado: ${presentacion.producto?.nombre || 'Producto'} · ${presentacion.nombre} ${result.stockCerradoAntes} -> ${cant}`,
      category: "DB",
      metadata: {
        productoId: presentacion.productoId,
        productoNombre: presentacion.producto?.nombre || null,
        codigoBarra: presentacion.producto?.codigoBarra || null,
        presentacionId,
        presentacionNombre: presentacion.nombre,
        stockCerradoAntes: result.stockCerradoAntes,
        stockCerradoDespues: cant,
        motivo: motivo || null,
      },
      userId,
    });

    return { error: false, msg: "Stock cerrado actualizado", data: result.actualizado };
  } catch (e) {
    await auditAction({
      level: "ERROR",
      action: "CONTEO_MANUAL",
      message: e?.message || "Error en conteo manual stock cerrado",
      category: "DB",
      metadata: { presentacionId, motivo: motivo || null },
      userId,
    });
    return { error: true, msg: e?.message || "Error en conteo manual" };
  }
}
