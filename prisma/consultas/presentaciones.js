"use server"
import prisma from "../prisma";

export async function getPresentacionesPorProducto(productoId) {
  try {
    return await prisma.presentaciones.findMany({
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
  } catch (error) {
    console.error("Error al obtener presentaciones:", error);
    return [];
  }
}

export async function getPresentacionPorId(id) {
  try {
    return await prisma.presentaciones.findUnique({
      where: { id },
      include: {
        tipoPresentacion: true,
        producto: true,
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
    });
  } catch (error) {
    console.error("Error al obtener presentación:", error);
    return null;
  }
}

export async function calcularEquivalencia(presentacionId, cantidad) {
  try {
    const presentacion = await prisma.presentaciones.findUnique({
      where: { id: presentacionId },
      include: {
        contenidas: {
          include: {
            presentacionContenida: true,
          },
        },
      },
    });

    if (!presentacion) return null;

    // Calcular equivalencia recursiva
    let equivalenciaBase = cantidad * presentacion.cantidad;

    // Si tiene presentaciones contenidas, calcular recursivamente
    for (const agrupacion of presentacion.contenidas) {
      const subEquivalencia = await calcularEquivalencia(
        agrupacion.presentacionContenidaId,
        agrupacion.cantidad
      );
      if (subEquivalencia) {
        equivalenciaBase += subEquivalencia * cantidad;
      }
    }

    return equivalenciaBase;
  } catch (error) {
    console.error("Error al calcular equivalencia:", error);
    return null;
  }
}

