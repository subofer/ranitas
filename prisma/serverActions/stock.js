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

/**
 * Abrir una presentación: convierte X unidades de esta presentación a su contenido directo.
 * - Si la presentación contiene otra presentación → incrementa stock de la contenida
 * - Si la presentación contiene la unidad base → incrementa stockSuelto del producto
 * 
 * Ejemplo: Abrir 1 Caja (que contiene 12 Frascos) → +12 Frascos (o stockSuelto si Frasco es base)
 */
export async function abrirPresentacion({ presentacionId, cantidad } = {}) {
  const cant = normalizarEnteroPositivo(cantidad);
  if (!presentacionId) return { error: true, msg: "Falta presentacionId" };
  if (cant <= 0) return { error: true, msg: "Cantidad inválida" };

  // Obtener la presentación y su relación directa (qué contiene)
  const presentacion = await prisma.presentaciones.findUnique({
    where: { id: presentacionId },
    include: {
      producto: {
        select: {
          id: true,
          stockSuelto: true,
          nombre: true,
        },
      },
      stock: true,
      // La relación: esta presentación CONTIENE a otra
      contenidas: {
        select: {
          id: true,
          cantidad: true,
          presentacionContenidaId: true,
          presentacionContenida: {
            select: {
              id: true,
              nombre: true,
              esUnidadBase: true,
            },
          },
        },
      },
    },
  });

  if (!presentacion) return { error: true, msg: "Presentación no encontrada" };

  // Buscar la relación directa (esta presentación → contiene X unidades de otra)
  const relacionDirecta = presentacion.contenidas?.[0];
  if (!relacionDirecta) {
    return {
      error: true,
      msg: "Esta presentación no tiene una equivalencia definida. Configurá qué contiene.",
    };
  }

  const contenidaId = relacionDirecta.presentacionContenidaId;
  const factorDirecto = Number(relacionDirecta.cantidad);
  const esContenidaBase = relacionDirecta.presentacionContenida?.esUnidadBase;

  if (!esNumeroValido(factorDirecto) || factorDirecto <= 0) {
    return { error: true, msg: "Cantidad de equivalencia inválida." };
  }

  const unidadesResultantes = Math.round(cant * factorDirecto);
  if (unidadesResultantes <= 0) {
    return { error: true, msg: "Equivalencia inválida (unidades resultantes <= 0)." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar stock cerrado disponible de esta presentación
      const stock = await tx.stockPresentacion.findUnique({
        where: { presentacionId },
      });

      const stockDisponible = stock?.stockCerrado ?? 0;
      if (stockDisponible < cant) {
        throw new Error(`Stock insuficiente. Disponible: ${stockDisponible}`);
      }

      // Decrementar stock cerrado de esta presentación
      await tx.stockPresentacion.update({
        where: { presentacionId },
        data: { stockCerrado: { decrement: cant } },
      });

      let resultadoContenida;
      if (esContenidaBase) {
        // Si la contenida es la base → incrementar stockSuelto del producto
        resultadoContenida = await tx.productos.update({
          where: { id: presentacion.productoId },
          data: { stockSuelto: { increment: unidadesResultantes } },
          select: { id: true, stockSuelto: true },
        });
      } else {
        // Si la contenida es otra presentación → incrementar su stock cerrado
        const stockContenida = await tx.stockPresentacion.findUnique({
          where: { presentacionId: contenidaId },
        });

        if (!stockContenida) {
          await tx.stockPresentacion.create({
            data: { presentacionId: contenidaId, stockCerrado: unidadesResultantes },
          });
        } else {
          await tx.stockPresentacion.update({
            where: { presentacionId: contenidaId },
            data: { stockCerrado: { increment: unidadesResultantes } },
          });
        }
        resultadoContenida = { presentacionId: contenidaId, incremento: unidadesResultantes };
      }

      return { 
        presentacionAbierta: presentacionId,
        cantidad: cant,
        contenidaId,
        unidadesResultantes,
        esContenidaBase,
        resultadoContenida,
      };
    });

    return {
      error: false,
      msg: `Abierto: ${cant} → ${unidadesResultantes} ${esContenidaBase ? 'unidades base' : 'unidades'}`,
      data: result,
    };
  } catch (e) {
    return { error: true, msg: e?.message || "Error abriendo presentación" };
  }
}

/**
 * Cerrar una presentación: convierte unidades de la contenida en esta presentación.
 * - Si la contenida es la unidad base → toma de stockSuelto del producto
 * - Si la contenida es otra presentación → toma de su stock cerrado
 * 
 * Ejemplo: Cerrar 1 Caja (que contiene 12 Frascos) → -12 Frascos (o stockSuelto) y +1 Caja
 */
export async function cerrarPresentacion({ presentacionId, cantidad } = {}) {
  const cant = normalizarEnteroPositivo(cantidad);
  if (!presentacionId) return { error: true, msg: "Falta presentacionId" };
  if (cant <= 0) return { error: true, msg: "Cantidad inválida" };

  // Obtener la presentación y su relación directa (qué contiene)
  const presentacion = await prisma.presentaciones.findUnique({
    where: { id: presentacionId },
    include: {
      producto: {
        select: {
          id: true,
          stockSuelto: true,
          nombre: true,
        },
      },
      stock: true,
      // La relación: esta presentación CONTIENE a otra
      contenidas: {
        select: {
          id: true,
          cantidad: true,
          presentacionContenidaId: true,
          presentacionContenida: {
            select: {
              id: true,
              nombre: true,
              esUnidadBase: true,
              stock: true,
            },
          },
        },
      },
    },
  });

  if (!presentacion) return { error: true, msg: "Presentación no encontrada" };

  // Buscar la relación directa (esta presentación → contiene X unidades de otra)
  const relacionDirecta = presentacion.contenidas?.[0];
  if (!relacionDirecta) {
    return {
      error: true,
      msg: "Esta presentación no tiene una equivalencia definida. Configurá qué contiene.",
    };
  }

  const contenidaId = relacionDirecta.presentacionContenidaId;
  const factorDirecto = Number(relacionDirecta.cantidad);
  const esContenidaBase = relacionDirecta.presentacionContenida?.esUnidadBase;

  if (!esNumeroValido(factorDirecto) || factorDirecto <= 0) {
    return { error: true, msg: "Cantidad de equivalencia inválida." };
  }

  const unidadesNecesarias = Math.round(cant * factorDirecto);
  if (unidadesNecesarias <= 0) {
    return { error: true, msg: "Equivalencia inválida (unidades requeridas <= 0)." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (esContenidaBase) {
        // Si la contenida es la base → verificar y decrementar stockSuelto del producto
        const producto = await tx.productos.findUnique({
          where: { id: presentacion.productoId },
          select: { stockSuelto: true },
        });

        if (!producto || producto.stockSuelto < unidadesNecesarias) {
          throw new Error(`Stock suelto insuficiente. Disponible: ${producto?.stockSuelto ?? 0}, Necesario: ${unidadesNecesarias}`);
        }

        await tx.productos.update({
          where: { id: presentacion.productoId },
          data: { stockSuelto: { decrement: unidadesNecesarias } },
        });
      } else {
        // Si la contenida es otra presentación → verificar y decrementar su stock cerrado
        const stockContenida = await tx.stockPresentacion.findUnique({
          where: { presentacionId: contenidaId },
        });

        const disponible = stockContenida?.stockCerrado ?? 0;
        if (disponible < unidadesNecesarias) {
          throw new Error(`Stock de ${relacionDirecta.presentacionContenida?.nombre || 'presentación contenida'} insuficiente. Disponible: ${disponible}, Necesario: ${unidadesNecesarias}`);
        }

        await tx.stockPresentacion.update({
          where: { presentacionId: contenidaId },
          data: { stockCerrado: { decrement: unidadesNecesarias } },
        });
      }

      // Incrementar stock cerrado de esta presentación
      const stockActual = await tx.stockPresentacion.findUnique({
        where: { presentacionId },
      });

      if (!stockActual) {
        await tx.stockPresentacion.create({
          data: { presentacionId, stockCerrado: cant },
        });
      } else {
        await tx.stockPresentacion.update({
          where: { presentacionId },
          data: { stockCerrado: { increment: cant } },
        });
      }

      return { 
        presentacionCerrada: presentacionId,
        cantidad: cant,
        contenidaId,
        unidadesUsadas: unidadesNecesarias,
        esContenidaBase,
      };
    });

    return {
      error: false,
      msg: `Cerrado: ${unidadesNecesarias} ${esContenidaBase ? 'unidades base' : 'unidades'} → ${cant}`,
      data: result,
    };
  } catch (e) {
    return { error: true, msg: e?.message || "Error cerrando presentación" };
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
