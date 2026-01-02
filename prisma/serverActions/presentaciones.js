"use server"
import prisma from "../prisma";
import { revalidatePath } from "next/cache";

const revalidarPresentaciones = () => revalidatePath("/cargarProductos");

export async function guardarPresentacion(formData) {
  const transformedData = {
    nombre: formData.nombre,
    productoId: formData.productoId,
    tipoPresentacionId: formData.tipoPresentacionId,
    cantidad: parseFloat(formData.cantidad) || 1,
    unidadMedida: formData.unidadMedida,
    contenidoPorUnidad: formData.contenidoPorUnidad ? parseFloat(formData.contenidoPorUnidad) : null,
    unidadContenido: formData.unidadContenido || null,
  };

  try {
    const presentacion = await prisma.presentaciones.upsert({
      where: { id: formData.id || "new" },
      update: transformedData,
      create: transformedData,
    });

    revalidarPresentaciones();
    return { error: false, msg: "Presentación guardada con éxito", data: presentacion };
  } catch (error) {
    console.error("Error al guardar presentación:", error);
    let msg = "Error al procesar la presentación";
    return { error: true, msg, data: null };
  }
}

export async function eliminarPresentacion(id) {
  try {
    await prisma.presentaciones.delete({
      where: { id },
    });
    revalidarPresentaciones();
    return { error: false, msg: "Presentación eliminada con éxito" };
  } catch (error) {
    console.error("Error al eliminar presentación:", error);
    return { error: true, msg: "Error al eliminar la presentación." };
  }
}

export async function obtenerPresentacionesPorProducto(productoId) {
  try {
    const presentaciones = await prisma.presentaciones.findMany({
      where: { productoId },
      include: {
        tipoPresentacion: true,
        contenidas: {
          include: {
            presentacionContenida: {
              include: {
                tipoPresentacion: true,
              },
            },
          },
        },
        contenedoras: {
          include: {
            presentacionContenedora: {
              include: {
                tipoPresentacion: true,
              },
            },
          },
        },
      },
      orderBy: { nombre: "asc" },
    });
    return { error: false, data: presentaciones };
  } catch (error) {
    console.error("Error al obtener presentaciones:", error);
    return { error: true, data: [] };
  }
}

