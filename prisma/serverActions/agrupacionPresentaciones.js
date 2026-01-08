"use server"
import prisma from "../prisma";
import { revalidatePath } from "next/cache";

const revalidarAgrupaciones = () => revalidatePath("/cargarProductos");

export async function guardarAgrupacionPresentaciones(formData) {
  const transformedData = {
    presentacionContenidaId: formData.presentacionContenidaId,
    presentacionContenedoraId: formData.presentacionContenedoraId,
    cantidad: parseFloat(formData.cantidad) || 1,
  };

  try {
    const agrupacion = await prisma.agrupacionPresentaciones.upsert({
      where: {
        presentacionContenidaId_presentacionContenedoraId: {
          presentacionContenidaId: transformedData.presentacionContenidaId,
          presentacionContenedoraId: transformedData.presentacionContenedoraId,
        },
      },
      update: { cantidad: transformedData.cantidad },
      create: transformedData,
    });

    revalidarAgrupaciones();
    return { error: false, msg: "Agrupación guardada con éxito", data: agrupacion };
  } catch (error) {
    console.error("Error al guardar agrupación:", error);
    let msg = "Error al procesar la agrupación";
    return { error: true, msg, data: null };
  }
}

export async function eliminarAgrupacionPresentaciones(id) {
  try {
    await prisma.agrupacionPresentaciones.delete({
      where: { id },
    });
    revalidarAgrupaciones();
    return { error: false, msg: "Agrupación eliminada con éxito" };
  } catch (error) {
    console.error("Error al eliminar agrupación:", error);
    return { error: true, msg: "Error al eliminar la agrupación." };
  }
}

export async function obtenerAgrupacionesPorPresentacion(presentacionId) {
  try {
    const agrupaciones = await prisma.agrupacionPresentaciones.findMany({
      where: {
        OR: [
          { presentacionContenidaId: presentacionId },
          { presentacionContenedoraId: presentacionId },
        ],
      },
      include: {
        presentacionContenida: {
          include: {
            tipoPresentacion: true,
            producto: true,
          },
        },
        presentacionContenedora: {
          include: {
            tipoPresentacion: true,
            producto: true,
          },
        },
      },
    });
    return { error: false, data: agrupaciones };
  } catch (error) {
    console.error("Error al obtener agrupaciones:", error);
    return { error: true, data: [] };
  }
}

