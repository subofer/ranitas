"use server";

import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import { auditAction } from "@/lib/actions/audit";
import { getSession } from "@/lib/sesion/sesion";

const revalidate = () => {
  revalidatePath("/compras");
  revalidatePath("/productosProveedor");
  revalidatePath("/pedidos");
};

export const upsertAliasPresentacionProveedor = async ({
  proveedorId,
  productoId,
  presentacionId,
  alias,
  sku,
  nombreEnProveedor,
}) => {
  if (!proveedorId) throw new Error("Falta proveedorId");
  const effectiveSku = String(sku ?? alias ?? "").trim();
  if (!effectiveSku) throw new Error("Falta sku/alias");

  const session = await getSession();
  const userId = session?.user || "Sistema";

  const cleanedSku = effectiveSku;
  const cleanedNombre = String(nombreEnProveedor ?? effectiveSku).trim();

  const res = await prisma.proveedorSkuAlias.upsert({
    where: {
      proveedorId_sku: { proveedorId, sku: cleanedSku },
    },
    update: {
      nombreEnProveedor: cleanedNombre,
      productoId,
      presentacionId,
    },
    create: {
      proveedorId,
      sku: cleanedSku,
      nombreEnProveedor: cleanedNombre,
      productoId,
      presentacionId,
    },
  });

  // Si no quedó mapeado, crear (si no existe) un pendiente para unir alias -> producto/presentación
  if (!res?.productoId && !res?.presentacionId) {
    const yaExiste = await prisma.correccionPendiente.findFirst({
      where: {
        estado: 'ABIERTO',
        tipo: 'ALIAS_PRESENTACION_PROVEEDOR',
        payload: {
          path: ['aliasId'],
          equals: res.id,
        },
      },
      select: { id: true },
    });

    if (!yaExiste) {
      await prisma.correccionPendiente.create({
        data: {
          tipo: 'ALIAS_PRESENTACION_PROVEEDOR',
          titulo: `Mapear alias proveedor: ${cleanedNombre}`,
          descripcion: `Proveedor ${proveedorId} - SKU: ${cleanedSku}`,
          entidadTipo: 'ProveedorSkuAlias',
          entidadId: res.id,
          contexto: 'FACTURAS',
          payload: {
            aliasId: res.id,
            proveedorId,
            sku: cleanedSku,
            nombreEnProveedor: cleanedNombre,
          },
          creadoPor: userId,
        },
      });
    }
  } else {
    // Si se mapeó, resolver cualquier pendiente abierto asociado al alias
    await prisma.correccionPendiente.updateMany({
      where: {
        estado: 'ABIERTO',
        tipo: 'ALIAS_PRESENTACION_PROVEEDOR',
        payload: {
          path: ['aliasId'],
          equals: res.id,
        },
      },
      data: {
        estado: 'RESUELTO',
        resueltoAt: new Date(),
        resueltoPor: userId,
        notasResolucion: 'Alias mapeado desde UI',
      },
    });
  }

  try {
    await auditAction({
      level: "SUCCESS",
      action: "UPSERT_ALIAS_PRESENTACION_PROVEEDOR",
      message: `Alias guardado para proveedor ${proveedorId} - sku ${cleanedSku}`,
      category: "DB",
      metadata: {
        proveedorId,
        sku: cleanedSku,
        nombreEnProveedor: cleanedNombre,
        productoId,
        presentacionId,
      },
      userId,
    });
  } catch (_) {
    // No romper el flujo por auditoría
  }

  revalidate();
  return { success: true, alias: res };
};

export const getAliasesProveedor = async ({ proveedorId, productoId } = {}) => {
  if (!proveedorId) throw new Error("Falta proveedorId");

  const where = { proveedorId };
  if (productoId) where.productoId = productoId;

  const aliases = await prisma.proveedorSkuAlias.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      producto: {
        include: {
          presentaciones: true,
          precios: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
      presentacion: true,
    },
  });

  return { success: true, aliases };
};
